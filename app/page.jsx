"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../app/lib/supabase";

const STATUS_OPTIONS = [
  "Planning",
  "Applied",
  "Interview",
  "Offer",
  "Rejected",
  "Withdrawn",
];

const CATEGORY_OPTIONS = [
  "Work",
  "Hackathon",
  "Programme/Workshop",
  "Fellowship",
  "Grant",
  "Other",
];

const STATUS_COLORS = {
  Planning: "bg-blue-100 text-blue-800",
  Applied: "bg-cyan-100 text-cyan-800",
  Interview: "bg-green-100 text-green-800",
  Offer: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-800",
  Withdrawn: "bg-slate-100 text-slate-700",
};

const STATUS_EMOJIS = {
  Planning: "📋",
  Applied: "📤",
  Interview: "💬",
  Offer: "🎉",
  Rejected: "❌",
  Withdrawn: "🚫",
};

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const INITIAL_FORM = {
  title: "",
  deadline: "",
  category: "",
  status: "Planning",
  link: "",
  notes: "",
};

function NotesCell({ notes }) {
  const [expanded, setExpanded] = useState(false);

  if (!notes || !notes.trim()) {
    return <span className="text-slate-400">—</span>;
  }

  const lines = notes.split("\n").filter((line) => line.trim() !== "");
  const shouldCollapse = notes.length > 120 || lines.length > 3;

  return (
    <div className="max-w-xs">
      <div
        className={`whitespace-pre-wrap break-words text-sm text-slate-600 ${
          !expanded && shouldCollapse ? "line-clamp-3" : ""
        }`}
      >
        {notes}
      </div>

      {shouldCollapse && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-1 text-xs font-semibold text-blue-600 hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

export default function HomePage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState(INITIAL_FORM);

  const [filters, setFilters] = useState({
    deadline: "",
    category: "",
    status: "",
  });

  useEffect(() => {
    fetchApplications();
  }, []);

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setShowForm(false);
  }

  function openAddForm() {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setDeleteConfirmId(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEdit(app) {
    setEditingId(app.id);
    setDeleteConfirmId(null);
    setShowForm(true);
    setForm({
      title: app.title || "",
      deadline: app.deadline || "",
      category: app.category || "",
      status: app.status || "Planning",
      link: app.link || "",
      notes: app.notes || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetFilters() {
    setFilters({
      deadline: "",
      category: "",
      status: "",
    });
  }

  async function fetchApplications() {
    setLoading(true);

    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      showToast(error.message, "error");
      setApplications([]);
    } else {
      setApplications(data || []);
    }

    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.title.trim()) {
      showToast("Application title is required.", "error");
      return;
    }

    if (!editingId && applications.length >= 999) {
      showToast("Maximum limit of 999 applications reached.", "error");
      return;
    }

    setSubmitting(true);

    const payload = {
      title: form.title.trim(),
      deadline: form.deadline || null,
      category: form.category || null,
      status: form.status,
      link: form.link.trim() || null,
      notes: form.notes.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("applications")
        .update(payload)
        .eq("id", editingId);

      setSubmitting(false);

      if (error) {
        showToast(error.message, "error");
        return;
      }

      showToast("Application updated!");
      resetForm();
      fetchApplications();
      return;
    }

    const { error } = await supabase.from("applications").insert(payload);

    setSubmitting(false);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    showToast("Application added!");
    resetForm();
    fetchApplications();
  }

  async function updateStatus(id, newStatus) {
    const oldApplications = applications;

    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
    );

    const { error } = await supabase
      .from("applications")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      setApplications(oldApplications);
      showToast(error.message, "error");
    }
  }

  async function confirmDelete(id) {
    const wasEditing = editingId === id;

    const { error } = await supabase.from("applications").delete().eq("id", id);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    setApplications((prev) => prev.filter((app) => app.id !== id));
    setDeleteConfirmId(null);

    if (wasEditing) {
      resetForm();
    }

    showToast("Application deleted");
  }

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesDeadline = filters.deadline
        ? app.deadline === filters.deadline
        : true;

      const matchesCategory = filters.category
        ? app.category === filters.category
        : true;

      const matchesStatus = filters.status
        ? app.status === filters.status
        : true;

      return matchesDeadline && matchesCategory && matchesStatus;
    });
  }, [applications, filters]);

  const stats = useMemo(() => {
    const counts = {
      Total: filteredApplications.length,
      Planning: 0,
      Applied: 0,
      Interview: 0,
      Offer: 0,
      Rejected: 0,
      Withdrawn: 0,
    };

    for (const app of filteredApplications) {
      if (counts[app.status] !== undefined) {
        counts[app.status] += 1;
      }
    }

    return counts;
  }, [filteredApplications]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <div className="mb-2 flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Trackr logo"
              width={44}
              height={44}
              className="h-11 w-11 rounded-xl object-contain"
              priority
            />
            <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
              Trackr
            </h1>
          </div>
          <p className="text-lg text-slate-500">
            Keep track of all your applications
          </p>
        </header>

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
            <p className="text-sm text-slate-500">
              View and manage your application progress
            </p>
          </div>

          {!showForm && (
            <button
              type="button"
              onClick={openAddForm}
              className="w-fit rounded-lg bg-blue-500 px-5 py-2.5 font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-blue-600"
            >
              + Add Application
            </button>
          )}
        </div>

        {showForm && (
          <div className="mb-8 rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h3 className="text-xl font-semibold text-slate-900">
                {editingId ? "Edit Application" : "Add New Application"}
              </h3>

              <button
                type="button"
                onClick={resetForm}
                className="w-fit rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
              >
                {editingId ? "Cancel Edit" : "Close"}
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
            >
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-500">
                  Application Title *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-500">
                  Deadline
                </label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, deadline: e.target.value }))
                  }
                  className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-500">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a category</option>
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-500">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_EMOJIS[status]} {status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-500">
                  Link
                </label>
                <input
                  type="url"
                  value={form.link}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, link: e.target.value }))
                  }
                  className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="lg:col-span-3">
                <label className="mb-1 block text-sm font-medium text-slate-500">
                  Additional Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  rows={6}
                  placeholder={`You can write multi-line notes here, for example:

• Submitted CV and portfolio
• Waiting for email confirmation
• Interview preparation: review project experience`}
                  className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Tip: You can paste or type bullets like •, -, or numbers.
                </p>
              </div>

              <div className="lg:col-span-3 flex items-end justify-end gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg bg-slate-200 px-5 py-2.5 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-300"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-500 px-6 py-2.5 font-semibold text-white shadow-md transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? editingId
                      ? "Saving..."
                      : "Adding..."
                    : editingId
                    ? "Save Changes"
                    : "Add Application"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="mb-6 rounded-2xl bg-white p-4 shadow-lg">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Filters</h3>
              <p className="text-sm text-slate-500">
                Filter applications by deadline, category, and status
              </p>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="w-fit rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
            >
              Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-500">
                Filter by Deadline
              </label>
              <input
                type="date"
                value={filters.deadline}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, deadline: e.target.value }))
                }
                className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-500">
                Filter by Category
              </label>
              <select
                value={filters.category}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, category: e.target.value }))
                }
                className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All categories</option>
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-500">
                Filter by Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, status: e.target.value }))
                }
                className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_EMOJIS[status]} {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          {Object.entries(stats).map(([label, count]) => (
            <div
              key={label}
              className={`rounded-lg p-3 text-center ${
                label === "Total"
                  ? "bg-slate-200"
                  : STATUS_COLORS[label] || "bg-slate-200 text-slate-900"
              }`}
            >
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-xs font-medium">{label}</div>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                    Deadline
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                    Notes
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                    Link
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-900">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {!loading &&
                  filteredApplications.map((app) => (
                    <tr key={app.id} className="border-b border-slate-700/20">
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-slate-900">
                          {app.title}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top text-sm text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                          {app.category || "—"}
                        </span>
                      </td>

                      <td className="px-4 py-3 align-top text-sm text-slate-500">
                        {formatDate(app.deadline)}
                      </td>

                      <td className="px-4 py-3 align-top">
                        <select
                          value={app.status}
                          onChange={(e) => updateStatus(app.id, e.target.value)}
                          className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold outline-none ${STATUS_COLORS[app.status]}`}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {STATUS_EMOJIS[status]} {status}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <NotesCell notes={app.notes} />
                      </td>

                      <td className="px-4 py-3 align-top">
                        {app.link ? (
                          <a
                            href={app.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-blue-500 hover:underline"
                          >
                            🔗 Open
                          </a>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top text-center">
                        {deleteConfirmId === app.id ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => confirmDelete(app.id)}
                              className="rounded bg-red-500 px-3 py-1 text-xs font-semibold text-white"
                            >
                              Delete?
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="rounded bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(app)}
                              className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-200"
                              title="Edit"
                            >
                              ✏️
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(app.id)}
                              className="rounded-lg p-2 text-red-400 transition hover:bg-red-100"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {!loading && filteredApplications.length === 0 && applications.length > 0 && (
            <div className="p-12 text-center">
              <div className="mb-4 text-5xl">🔎</div>
              <h3 className="mb-2 text-xl font-semibold text-slate-900">
                No matching applications
              </h3>
              <p className="text-slate-500">
                Try changing or resetting your filters.
              </p>
            </div>
          )}

          {!loading && applications.length === 0 && (
            <div className="p-12 text-center">
              <div className="mb-4 text-5xl">📝</div>
              <h3 className="mb-2 text-xl font-semibold text-slate-900">
                No applications yet
              </h3>
              <p className="text-slate-500">
                Click the Add Application button to get started!
              </p>
            </div>
          )}

          {applications.length >= 999 && (
            <div className="bg-amber-100 p-4 text-center text-amber-800">
              ⚠️ Maximum limit of 999 applications reached. Please delete some
              to add more.
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 rounded-lg px-4 py-2 text-white shadow-lg ${
            toast.type === "error" ? "bg-red-600" : "bg-green-500"
          }`}
        >
          {toast.message}
        </div>
      )}
    </main>
  );
}