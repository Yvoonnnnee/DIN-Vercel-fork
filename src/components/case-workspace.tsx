"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";

type RecordSummary = {
  id: string;
  title?: string | null;
  fullName?: string | null;
  createdAt: string | Date;
  description?: string | null;
  type?: string | null;
  status?: string | null;
  content?: string | null;
  senderName?: string | null;
};

type CaseWorkspaceProps = {
  caseId: string;
  roleLabel: string;
  canContribute: boolean;
  evidence: RecordSummary[];
  witnesses: RecordSummary[];
  consultants: RecordSummary[];
  expertiseRequests: RecordSummary[];
  messages: RecordSummary[];
};

const sections = [
  { key: "evidence", label: "Evidence" },
  { key: "witnesses", label: "Witnesses" },
  { key: "consultants", label: "Consultants" },
  { key: "expertise", label: "Expertise" },
  { key: "messages", label: "Messages" },
] as const;

export function CaseWorkspace(props: CaseWorkspaceProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<(typeof sections)[number]["key"]>("evidence");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [forms, setForms] = useState({
    evidence: { title: "", description: "", type: "document", notes: "" },
    witness: { fullName: "", email: "", phone: "", relationship: "", statement: "", notes: "" },
    consultant: {
      fullName: "",
      email: "",
      phone: "",
      company: "",
      expertise: "",
      role: "",
      report: "",
      notes: "",
    },
    expertise: { title: "", description: "" },
    message: { content: "" },
  });

  async function submit(path: string, body: unknown) {
    setError(null);

    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();

    if (!response.ok) {
      setError(result.error?.message || "Request failed.");
      return false;
    }

    router.refresh();
    return true;
  }

  async function remove(path: string) {
    setError(null);
    const response = await fetch(path, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error?.message || "Delete failed.");
      return;
    }
    router.refresh();
  }

  function renderList(records: RecordSummary[], kind: "evidence" | "witnesses" | "consultants" | "expertise" | "messages") {
    if (records.length === 0) {
      return <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No records yet.</div>;
    }

    return (
      <div className="space-y-3">
        {records.map((record) => (
          <div key={record.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="font-semibold text-slate-900">
                  {record.title || record.fullName || record.senderName || "Record"}
                </div>
                <div className="text-sm text-slate-600">
                  {record.description || record.content || record.type || record.status || "No details"}
                </div>
              </div>
              {kind !== "messages" ? (
                <button
                  type="button"
                  onClick={() =>
                    startTransition(() =>
                      remove(
                        `/api/cases/${props.caseId}/${kind === "expertise" ? "expertise" : kind}/${record.id}`,
                      ),
                    )
                  }
                  className="text-sm font-medium text-rose-600 hover:text-rose-700"
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="space-y-6 rounded-[28px] border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Phase 2 workspace</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Supporting records</h2>
        </div>
        <Link
          href={`/cases/${props.caseId}/edit` as Route}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
        >
          Edit case
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {sections.map((section) => (
          <button
            key={section.key}
            type="button"
            onClick={() => setActiveSection(section.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeSection === section.key
                ? "bg-ink text-white"
                : "border border-slate-300 text-slate-700 hover:border-slate-400"
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {activeSection === "evidence" ? (
        <div className="space-y-5">
          {props.canContribute ? (
            <form
              className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                startTransition(async () => {
                  const success = await submit(`/api/cases/${props.caseId}/evidence`, forms.evidence);
                  if (success) {
                    setForms((current) => ({
                      ...current,
                      evidence: { title: "", description: "", type: "document", notes: "" },
                    }));
                  }
                });
              }}
            >
              <input
                value={forms.evidence.title}
                onChange={(event) =>
                  setForms((current) => ({
                    ...current,
                    evidence: { ...current.evidence, title: event.target.value },
                  }))
                }
                placeholder="Evidence title"
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
              />
              <select
                value={forms.evidence.type}
                onChange={(event) =>
                  setForms((current) => ({
                    ...current,
                    evidence: { ...current.evidence, type: event.target.value },
                  }))
                }
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
              >
                {["document", "contract", "correspondence", "photo", "video", "audio", "financial_record", "expert_report", "other"].map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
              <textarea
                value={forms.evidence.description}
                onChange={(event) =>
                  setForms((current) => ({
                    ...current,
                    evidence: { ...current.evidence, description: event.target.value },
                  }))
                }
                placeholder="Description"
                rows={3}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm md:col-span-2"
              />
              <button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 md:col-span-2"
              >
                Add evidence
              </button>
            </form>
          ) : null}
          {renderList(props.evidence, "evidence")}
        </div>
      ) : null}

      {activeSection === "witnesses" ? (
        <div className="space-y-5">
          {props.canContribute ? (
            <form
              className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                startTransition(async () => {
                  const success = await submit(`/api/cases/${props.caseId}/witnesses`, forms.witness);
                  if (success) {
                    setForms((current) => ({
                      ...current,
                      witness: { fullName: "", email: "", phone: "", relationship: "", statement: "", notes: "" },
                    }));
                  }
                });
              }}
            >
              {["fullName", "email", "phone", "relationship"].map((key) => (
                <input
                  key={key}
                  value={forms.witness[key as keyof typeof forms.witness]}
                  onChange={(event) =>
                    setForms((current) => ({
                      ...current,
                      witness: { ...current.witness, [key]: event.target.value },
                    }))
                  }
                  placeholder={key}
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                />
              ))}
              <textarea
                value={forms.witness.statement}
                onChange={(event) =>
                  setForms((current) => ({
                    ...current,
                    witness: { ...current.witness, statement: event.target.value },
                  }))
                }
                placeholder="Statement"
                rows={3}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm md:col-span-2"
              />
              <button type="submit" disabled={isPending} className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 md:col-span-2">
                Add witness
              </button>
            </form>
          ) : null}
          {renderList(props.witnesses, "witnesses")}
        </div>
      ) : null}

      {activeSection === "consultants" ? (
        <div className="space-y-5">
          {props.canContribute ? (
            <form
              className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                startTransition(async () => {
                  const success = await submit(`/api/cases/${props.caseId}/consultants`, forms.consultant);
                  if (success) {
                    setForms((current) => ({
                      ...current,
                      consultant: {
                        fullName: "",
                        email: "",
                        phone: "",
                        company: "",
                        expertise: "",
                        role: "",
                        report: "",
                        notes: "",
                      },
                    }));
                  }
                });
              }}
            >
              {["fullName", "email", "phone", "company", "expertise", "role"].map((key) => (
                <input
                  key={key}
                  value={forms.consultant[key as keyof typeof forms.consultant]}
                  onChange={(event) =>
                    setForms((current) => ({
                      ...current,
                      consultant: { ...current.consultant, [key]: event.target.value },
                    }))
                  }
                  placeholder={key}
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                />
              ))}
              <textarea
                value={forms.consultant.report}
                onChange={(event) =>
                  setForms((current) => ({
                    ...current,
                    consultant: { ...current.consultant, report: event.target.value },
                  }))
                }
                placeholder="Report summary"
                rows={3}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm md:col-span-2"
              />
              <button type="submit" disabled={isPending} className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 md:col-span-2">
                Add consultant
              </button>
            </form>
          ) : null}
          {renderList(props.consultants, "consultants")}
        </div>
      ) : null}

      {activeSection === "expertise" ? (
        <div className="space-y-5">
          {props.canContribute ? (
            <form
              className="grid gap-3 rounded-2xl bg-slate-50 p-4"
              onSubmit={(event) => {
                event.preventDefault();
                startTransition(async () => {
                  const success = await submit(`/api/cases/${props.caseId}/expertise`, forms.expertise);
                  if (success) {
                    setForms((current) => ({
                      ...current,
                      expertise: { title: "", description: "" },
                    }));
                  }
                });
              }}
            >
              <input
                value={forms.expertise.title}
                onChange={(event) =>
                  setForms((current) => ({
                    ...current,
                    expertise: { ...current.expertise, title: event.target.value },
                  }))
                }
                placeholder="Expertise title"
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
              />
              <textarea
                value={forms.expertise.description}
                onChange={(event) =>
                  setForms((current) => ({
                    ...current,
                    expertise: { ...current.expertise, description: event.target.value },
                  }))
                }
                placeholder="What analysis is needed?"
                rows={4}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
              />
              <button type="submit" disabled={isPending} className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
                Add expertise request
              </button>
            </form>
          ) : null}
          {renderList(props.expertiseRequests, "expertise")}
        </div>
      ) : null}

      {activeSection === "messages" ? (
        <div className="space-y-5">
          <form
            className="grid gap-3 rounded-2xl bg-slate-50 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const success = await submit(`/api/cases/${props.caseId}/messages`, forms.message);
                if (success) {
                  setForms((current) => ({
                    ...current,
                    message: { content: "" },
                  }));
                }
              });
            }}
          >
            <textarea
              value={forms.message.content}
              onChange={(event) =>
                setForms((current) => ({
                  ...current,
                  message: { content: event.target.value },
                }))
              }
              placeholder={`Send a message as ${props.roleLabel}`}
              rows={3}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
            />
            <button type="submit" disabled={isPending} className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
              Send message
            </button>
          </form>
          {renderList(props.messages, "messages")}
        </div>
      ) : null}
    </section>
  );
}
