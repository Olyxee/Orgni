import { Braces, Database, FileText } from "lucide-react";
import { BiLogoMicrosoftTeams } from "react-icons/bi";
import {
  PiMicrosoftExcelLogoFill,
  PiMicrosoftOutlookLogoFill,
} from "react-icons/pi";
import { SiGmail, SiGooglesheets, SiPostgresql, SiSap } from "react-icons/si";
import type { ElementType } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Sources from "./sources";
import { ConsolePageHeader } from "./shared";

const connections = [
  {
    name: "Uploaded evidence",
    detail: "Documents and data files",
    status: "Available",
    logos: [{ icon: FileText, color: "hsl(var(--muted-foreground))" }],
  },
  {
    name: "Microsoft Teams",
    detail: "Conversations and channels",
    status: "Not connected",
    logos: [{ icon: BiLogoMicrosoftTeams, color: "#6264A7" }],
  },
  {
    name: "Email",
    detail: "Gmail and Microsoft Outlook",
    status: "Not connected",
    logos: [
      { icon: SiGmail, color: "#EA4335" },
      { icon: PiMicrosoftOutlookLogoFill, color: "#0078D4" },
    ],
  },
  {
    name: "Spreadsheets",
    detail: "Google Sheets and Microsoft Excel",
    status: "Upload available",
    logos: [
      { icon: SiGooglesheets, color: "#34A853" },
      { icon: PiMicrosoftExcelLogoFill, color: "#217346" },
    ],
  },
  {
    name: "Databases",
    detail: "Structured operational records",
    status: "Coming later",
    logos: [
      { icon: SiPostgresql, color: "#4169E1" },
      { icon: Database, color: "hsl(var(--muted-foreground))" },
    ],
  },
  {
    name: "Systems and APIs",
    detail: "Finance, ERP and internal systems",
    status: "Coming later",
    logos: [
      { icon: SiSap, color: "#0FAAFF" },
      { icon: Braces, color: "hsl(var(--muted-foreground))" },
    ],
  },
] satisfies {
  name: string;
  detail: string;
  status: string;
  logos: { icon: ElementType; color: string }[];
}[];

export default function Connections() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <ConsolePageHeader
        title="Connections"
        description="Configure and inspect the organisational sources that provide evidence and activity to Orgni."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {connections.map((connection) => (
          <Card key={connection.name}>
            <CardContent className="flex items-start gap-3 p-4">
              <div
                className="flex min-w-12 items-center gap-1.5"
                aria-hidden="true"
              >
                {connection.logos.map((logo, index) => (
                  <logo.icon
                    key={index}
                    className="size-5"
                    style={{ color: logo.color }}
                  />
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <h2 className="text-sm font-medium">{connection.name}</h2>
                  <Badge
                    variant={
                      connection.status === "Available" ? "default" : "outline"
                    }
                    className="shrink-0 text-[10px]"
                  >
                    {connection.status}
                  </Badge>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {connection.detail}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <section className="border-t border-border pt-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Uploaded evidence</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The currently implemented connection for adding organisational
            evidence.
          </p>
        </div>
        <Sources embedded />
      </section>
    </div>
  );
}
