import { useState } from 'react';
import { useAdminFeatureFlags } from '../../hooks/useAdminFeatureFlags';
import { useUser } from '../../hooks/useUser';
import { TeamFeatureAccessTable } from '../../components/admin/TeamFeatureAccessTable';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Loader2, Plus, ShieldAlert, Globe, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export function SystemAdminPage() {
  const { isAdmin, loading: userLoading } = useUser();
  const {
    flags,
    loading: flagsLoading,
    toggleFlag,
    createFlag,
  } = useAdminFeatureFlags();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFlag, setNewFlag] = useState({
    flag_key: '',
    flag_name: '',
    description: '',
    is_enabled: false,
  });

  if (userLoading || flagsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">
          You do not have permission to access this page.
        </p>
      </div>
    );
  }

  const handleCreateFlag = async () => {
    if (!newFlag.flag_key || !newFlag.flag_name) {
      toast.error('Key and Name are required');
      return;
    }

    const result = await createFlag(newFlag);
    if (result) {
      toast.success('Feature flag created successfully');
      setIsCreateOpen(false);
      setNewFlag({
        flag_key: '',
        flag_name: '',
        description: '',
        is_enabled: false,
      });
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            System Administration
          </h1>
          <p className="text-muted-foreground">
            Manage global system settings and feature flags.
          </p>
        </div>
      </div>

      <Tabs defaultValue="global" className="space-y-4">
        <TabsList>
          <TabsTrigger value="global" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Global Flags
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Team Access
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle>Feature Flags</CardTitle>
                <CardDescription>
                  Control system-wide features and capabilities.
                </CardDescription>
              </div>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Flag
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Feature Flag</DialogTitle>
                    <DialogDescription>
                      Add a new feature flag to the system. The key must be
                      unique.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="key">Flag Key</Label>
                      <Input
                        id="key"
                        placeholder="e.g., ai_import"
                        value={newFlag.flag_key}
                        onChange={e =>
                          setNewFlag({ ...newFlag, flag_key: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="name">Display Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g., AI Import"
                        value={newFlag.flag_name}
                        onChange={e =>
                          setNewFlag({ ...newFlag, flag_name: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        placeholder="Enables AI-powered import features"
                        value={newFlag.description}
                        onChange={e =>
                          setNewFlag({
                            ...newFlag,
                            description: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="enabled"
                        checked={newFlag.is_enabled}
                        onCheckedChange={checked =>
                          setNewFlag({ ...newFlag, is_enabled: checked })
                        }
                      />
                      <Label htmlFor="enabled">Enabled by default</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreateFlag}>Create Flag</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flags.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No feature flags found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    flags.map(flag => (
                      <TableRow key={flag.id}>
                        <TableCell>
                          <Switch
                            checked={flag.is_enabled}
                            onCheckedChange={checked =>
                              toggleFlag(flag.id, !checked)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {flag.flag_name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="font-mono text-xs"
                          >
                            {flag.flag_key}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {flag.description}
                        </TableCell>
                        <TableCell className="text-right">
                          {/* Add edit/delete actions here if needed */}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams">
          <TeamFeatureAccessTable flags={flags} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
