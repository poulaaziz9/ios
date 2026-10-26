import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { strings } from "@/lib/strings";
import { QrScanner } from "./qr-scanner";

export default function ScanPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{strings.join.scanTitle}</CardTitle>
        <CardDescription>{strings.join.scanHint}</CardDescription>
      </CardHeader>
      <CardContent>
        <QrScanner />
      </CardContent>
    </Card>
  );
}
