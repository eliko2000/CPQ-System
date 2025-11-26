import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';
import { Input } from '../../ui/input';

export function CompanySettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>פרטי חברה</CardTitle>
          <CardDescription>מידע בסיסי על החברה</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">שם חברה</label>
              <Input placeholder="שם החברה" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                ח.פ./ע.מ.
              </label>
              <Input placeholder="ח.פ. או ע.מ." />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">כתובת</label>
            <Input placeholder="רחוב, מספר, עיר" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">טלפון</label>
              <Input placeholder="טלפון ראשי" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">פקס</label>
              <Input placeholder="מספר פקס" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              אתר אינטרנט
            </label>
            <Input placeholder="www.example.com" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>אנשי קשר</CardTitle>
          <CardDescription>אנשי קשר עיקריים בחברה</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                שם איש קשר
              </label>
              <Input placeholder="שם מלא" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">תפקיד</label>
              <Input placeholder="תפקיד בחברה" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">אימייל</label>
              <Input type="email" placeholder="email@company.com" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                טלפון נייד
              </label>
              <Input placeholder="טלפון נייד" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
