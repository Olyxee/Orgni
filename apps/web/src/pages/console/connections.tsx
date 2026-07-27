import {
  Archive,
  Check,
  Clock3,
  FileImage,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileType2,
  LockKeyhole,
  Plug,
  Presentation,
} from "lucide-react";
import { BiLogoMicrosoftTeams } from "react-icons/bi";
import { SiGmail, SiPostgresql, SiSap } from "react-icons/si";
import type { ElementType } from "react";
import { Button } from "@/components/ui/button";
import Sources from "./sources";
import { ConsolePageHeader } from "./shared";

const fileFamilies = [
  {
    label: "Documents",
    formats: "PDF, DOCX, RTF",
    icon: FileText,
    color: "text-red-600 bg-red-50",
  },
  {
    label: "Spreadsheets",
    formats: "XLSX, CSV, TSV",
    icon: FileSpreadsheet,
    color: "text-emerald-700 bg-emerald-50",
  },
  {
    label: "Presentations",
    formats: "PPTX",
    icon: Presentation,
    color: "text-orange-700 bg-orange-50",
  },
  {
    label: "Text",
    formats: "TXT, MD, HTML",
    icon: FileType2,
    color: "text-sky-700 bg-sky-50",
  },
  {
    label: "Structured data",
    formats: "JSON, XML",
    icon: FileJson,
    color: "text-violet-700 bg-violet-50",
  },
  {
    label: "Images",
    formats: "PNG, JPG",
    icon: FileImage,
    color: "text-fuchsia-700 bg-fuchsia-50",
  },
];

const integrations = [
  {
    name: "Microsoft Teams",
    detail: "Conversations, channels and meetings",
    icon: BiLogoMicrosoftTeams,
    color: "#6264A7",
  },
  {
    name: "Gmail",
    detail: "Messages, threads and attachments",
    icon: SiGmail,
    color: "#EA4335",
  },
  {
    name: "PostgreSQL",
    detail: "Operational and reference data",
    icon: SiPostgresql,
    color: "#4169E1",
  },
  {
    name: "SAP",
    detail: "Finance, procurement and ERP records",
    icon: SiSap,
    color: "#0FAAFF",
  },
] satisfies {
  name: string;
  detail: string;
  icon: ElementType;
  color: string;
}[];

export default function Connections() {
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <ConsolePageHeader
        title="Connections"
        description="Choose how organisational evidence reaches Orgni. Upload files today, then connect business systems as direct integrations become available."
      />

      <section aria-labelledby="upload-evidence-title">
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <div className="border-b border-border px-5 py-5 sm:px-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Archive className="size-5" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      id="upload-evidence-title"
                      className="text-base font-semibold"
                    >
                      Upload evidence
                    </h2>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <Check className="size-3.5" strokeWidth={2.5} />
                      Ready
                    </span>
                  </div>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Add one file or an entire batch. Orgni extracts the evidence
                    and builds your context model automatically.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <LockKeyhole className="size-3.5" />
                Tenant-isolated processing
              </div>
            </div>
          </div>

          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
            {fileFamilies.map((family) => (
              <div
                key={family.label}
                className="flex min-h-20 items-center gap-3 bg-card px-5 py-3"
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-md ${family.color}`}
                >
                  <family.icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{family.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {family.formats}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <Sources embedded />
        </div>
      </section>

      <section aria-labelledby="connect-tools-title" className="border-t pt-8">
        <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Plug className="size-4 text-muted-foreground" />
              <h2 id="connect-tools-title" className="text-lg font-semibold">
                Connect your tools
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Authorize Orgni to continuously sync evidence from the systems
              your organisation already uses.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="size-3.5" />
            Direct integrations are coming soon
          </div>
        </div>

        <div className="grid overflow-hidden rounded-md border border-border bg-card sm:grid-cols-2 xl:grid-cols-4">
          {integrations.map((integration, index) => (
            <div
              key={integration.name}
              aria-disabled="true"
              className={`flex min-h-48 flex-col p-5 ${
                index > 0 ? "border-t sm:border-t-0 sm:border-l" : ""
              } ${index === 2 ? "sm:border-l-0 sm:border-t xl:border-l xl:border-t-0" : ""} ${
                index === 3 ? "sm:border-t xl:border-t-0" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="flex size-11 items-center justify-center rounded-md border border-border bg-background">
                  <integration.icon
                    className="size-6"
                    style={{ color: integration.color }}
                  />
                </span>
                <span className="text-[10px] font-medium uppercase text-muted-foreground">
                  Soon
                </span>
              </div>
              <div className="mt-4 flex-1">
                <h3 className="text-sm font-semibold">{integration.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {integration.detail}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled
                className="mt-4 w-full"
              >
                <Plug />
                Connect
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
