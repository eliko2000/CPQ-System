import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import {
  DbProject,
  ProjectSummary,
  ProjectFormData,
  DbQuotation,
} from '../types';
import { logger } from '../lib/logger';
import { useTeam } from '../contexts/TeamContext';
import { generateProjectNumber } from '../services/numberingService';

export function useProjects() {
  const { currentTeam } = useTeam();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all projects with quotation counts
  const fetchProjects = useCallback(async () => {
    if (!currentTeam) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('project_summary')
        .select('*')
        .eq('team_id', currentTeam.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform snake_case to camelCase
      const transformedData = (data || []).map(proj => ({
        id: proj.id,
        projectNumber: proj.project_number,
        companyName: proj.company_name,
        projectName: proj.project_name,
        description: proj.description,
        status: proj.status,
        createdAt: proj.created_at,
        updatedAt: proj.updated_at,
        quotationCount: proj.quotation_count || 0,
        lastQuotationUpdate: proj.last_quotation_update,
      }));

      setProjects(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, [currentTeam]);

  // Add a new project
  const addProject = async (projectData: ProjectFormData) => {
    if (!currentTeam) throw new Error('No active team');

    try {
      setError(null);

      // Try to generate project number (optional feature)
      let projectNumber: string | undefined = undefined;
      try {
        projectNumber = await generateProjectNumber(currentTeam.id);
        logger.debug('Generated project number:', projectNumber);
      } catch (numberError) {
        logger.warn(
          'Could not generate project number, continuing without it:',
          numberError
        );
        // Continue without project number - it's optional
      }

      // Build insert data - only include project_number if it was generated
      const insertData: any = {
        company_name: projectData.companyName,
        project_name: projectData.projectName,
        description: projectData.description,
        status: projectData.status,
        team_id: currentTeam.id,
      };

      // Only add project_number if we successfully generated one
      if (projectNumber) {
        insertData.project_number = projectNumber;
      }

      const { data, error } = await supabase
        .from('projects')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      // Transform and add to local state
      const newProject: ProjectSummary = {
        id: data.id,
        projectNumber: data.project_number,
        companyName: data.company_name,
        projectName: data.project_name,
        description: data.description,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        quotationCount: 0,
      };

      setProjects(prev => [newProject, ...prev]);
      return newProject;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add project');
      throw err;
    }
  };

  // Update an existing project
  const updateProject = async (
    id: string,
    updates: Partial<ProjectFormData>
  ) => {
    if (!currentTeam) throw new Error('No active team');

    try {
      setError(null);

      // Transform camelCase to snake_case
      const dbUpdates: any = {};
      if (updates.companyName !== undefined)
        dbUpdates.company_name = updates.companyName;
      if (updates.projectName !== undefined)
        dbUpdates.project_name = updates.projectName;
      if (updates.description !== undefined)
        dbUpdates.description = updates.description;
      if (updates.status !== undefined) dbUpdates.status = updates.status;

      const { data, error } = await supabase
        .from('projects')
        .update(dbUpdates)
        .eq('id', id)
        .eq('team_id', currentTeam.id)
        .select()
        .single();

      if (error) throw error;

      // Cascade customer_name and project_name changes to linked quotations
      const quotationUpdates: any = {};
      if (updates.companyName !== undefined) {
        quotationUpdates.customer_name = updates.companyName;
      }
      if (updates.projectName !== undefined) {
        quotationUpdates.project_name = updates.projectName;
      }

      // Only update quotations if there are name changes
      if (Object.keys(quotationUpdates).length > 0) {
        const { error: quotationError } = await supabase
          .from('quotations')
          .update(quotationUpdates)
          .eq('project_id', id)
          .eq('team_id', currentTeam.id);

        if (quotationError) {
          logger.error(
            'Failed to cascade updates to quotations:',
            quotationError
          );
          // Don't throw - project update succeeded, quotation sync is secondary
        }
      }

      // Update local state
      setProjects(prev =>
        prev.map(proj =>
          proj.id === id
            ? {
                ...proj,
                projectNumber: data.project_number,
                companyName: data.company_name,
                projectName: data.project_name,
                description: data.description,
                status: data.status,
                updatedAt: data.updated_at,
              }
            : proj
        )
      );
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
      throw err;
    }
  };

  // Delete a project (with cascade delete of quotations)
  const deleteProject = async (id: string) => {
    if (!currentTeam) throw new Error('No active team');

    try {
      setError(null);

      // Get all quotations for this project
      const { data: quotations, error: checkError } = await supabase
        .from('quotations')
        .select('id')
        .eq('project_id', id)
        .eq('team_id', currentTeam.id);

      if (checkError) throw checkError;

      const quotationCount = quotations?.length || 0;

      // If project has quotations, delete them first (cascade)
      if (quotationCount > 0) {
        logger.info(`Deleting ${quotationCount} quotations for project ${id}`);

        const { error: deleteQuotationsError } = await supabase
          .from('quotations')
          .delete()
          .eq('project_id', id)
          .eq('team_id', currentTeam.id);

        if (deleteQuotationsError) {
          logger.error('Failed to delete quotations:', deleteQuotationsError);
          throw new Error('Failed to delete project quotations');
        }
      }

      // Delete the project
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('team_id', currentTeam.id);

      if (error) throw error;

      setProjects(prev => prev.filter(proj => proj.id !== id));

      return { quotationCount };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
      throw err;
    }
  };

  // Get a single project
  const getProject = async (id: string): Promise<DbProject | null> => {
    if (!currentTeam) return null;

    try {
      setError(null);

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('team_id', currentTeam.id)
        .single();

      if (error) throw error;

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch project');
      return null;
    }
  };

  // Get all quotations for a specific project
  const getProjectQuotations = async (
    projectId: string
  ): Promise<DbQuotation[]> => {
    if (!currentTeam) return [];

    try {
      setError(null);

      const { data, error } = await supabase
        .from('quotations')
        .select(
          `
          *,
          quotation_systems (
            *,
            quotation_items (
              *,
              component:components (*)
            )
          )
        `
        )
        .eq('project_id', projectId)
        .eq('team_id', currentTeam.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch project quotations'
      );
      return [];
    }
  };

  // Link a quotation to a project
  const linkQuotationToProject = async (
    quotationId: string,
    projectId: string
  ) => {
    if (!currentTeam) throw new Error('No active team');

    try {
      setError(null);

      const { error } = await supabase
        .from('quotations')
        .update({ project_id: projectId })
        .eq('id', quotationId)
        .eq('team_id', currentTeam.id);

      if (error) throw error;

      // Refresh projects to update quotation count
      await fetchProjects();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to link quotation to project'
      );
      throw err;
    }
  };

  // Unlink a quotation from a project
  const unlinkQuotationFromProject = async (quotationId: string) => {
    if (!currentTeam) throw new Error('No active team');

    try {
      setError(null);

      const { error } = await supabase
        .from('quotations')
        .update({ project_id: null })
        .eq('id', quotationId)
        .eq('team_id', currentTeam.id);

      if (error) throw error;

      // Refresh projects to update quotation count
      await fetchProjects();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to unlink quotation from project'
      );
      throw err;
    }
  };

  // Load projects on mount and when team changes
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    loading,
    error,
    fetchProjects,
    getProject,
    addProject,
    updateProject,
    deleteProject,
    getProjectQuotations,
    linkQuotationToProject,
    unlinkQuotationFromProject,
  };
}
