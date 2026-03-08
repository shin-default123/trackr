"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
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

const STATUS_DOT_COLORS = {
  Planning: "bg-blue-500",
  Applied: "bg-cyan-500",
  Interview: "bg-green-500",
  Offer: "bg-emerald-500",
  Rejected: "bg-red-500",
  Withdrawn: "bg-slate-500",
};

const STATUS_EMOJIS = {
  Planning: "📋",
  Applied: "📤",
  Interview: "💬",
  Offer: "🎉",
  Rejected: "❌",
  Withdrawn: "🚫",
};

const EVENT_STATUS_OPTIONS = ["Upcoming", "Done", "Cancelled"];

const EVENT_CATEGORY_OPTIONS = [
  "Meeting",
  "Deadline",
  "Workshop",
  "Conference",
  "Personal",
  "Other",
];

const EVENT_STATUS_COLORS = {
  Upcoming: "bg-violet-100 text-violet-800",
  Done: "bg-emerald-100 text-emerald-800",
  Cancelled: "bg-red-100 text-red-800",
};

const EVENT_STATUS_DOT_COLORS = {
  Upcoming: "bg-violet-500",
  Done: "bg-emerald-500",
  Cancelled: "bg-red-500",
};

const EVENT_STATUS_EMOJIS = {
  Upcoming: "📅",
  Done: "✅",
  Cancelled: "❌",
};

const OWNER_OPTIONS = [
  { value: "turtle", label: "Turtle", emoji: "🐢" },
  { value: "whale", label: "Whale", emoji: "🐋" },
];

const OWNER_EMOJIS = {
  turtle: "🐢",
  whale: "🐋",
};

const OWNER_LABELS = {
  turtle: "Turtle",
  whale: "Whale",
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateRange(startDateStr, endDateStr) {
  if (!startDateStr && !endDateStr) return "—";
  if (startDateStr && !endDateStr) return formatDate(startDateStr);
  if (!startDateStr && endDateStr) return formatDate(endDateStr);

  if (startDateStr === endDateStr) {
    return formatDate(startDateStr);
  }

  const start = new Date(`${startDateStr}T00:00:00`);
  const end = new Date(`${endDateStr}T00:00:00`);

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameMonth) {
    return `${start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}–${end.toLocaleDateString("en-US", {
      day: "numeric",
      year: "numeric",
    })}`;
  }

  if (sameYear) {
    return `${start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} – ${end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }

  return `${formatDate(startDateStr)} – ${formatDate(endDateStr)}`;
}

function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isWithinThisWeek(date, today) {
  const currentDay = today.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

  const startOfWeek = new Date(today);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(today.getDate() + diffToMonday);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return date >= startOfWeek && date <= endOfWeek;
}

function isWithinThisMonth(date, today) {
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth()
  );
}

function getMonthName(date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getCalendarDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();

  const cells = [];

  for (let i = 0; i < startOffset; i++) {
    const d = new Date(year, month, 1 - (startOffset - i));
    cells.push({ date: d, isCurrentMonth: false });
  }

  for (let day = 1; day <= totalDays; day++) {
    cells.push({ date: new Date(year, month, day), isCurrentMonth: true });
  }

  const remaining = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
  for (let i = 1; i <= remaining; i++) {
    cells.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }

  return cells;
}

const INITIAL_FORM = {
  title: "",
  deadline: "",
  category: "",
  status: "Planning",
  link: "",
  notes: "",
  is_important: false,
  owner: "turtle",
};

const INITIAL_EVENT_FORM = {
  title: "",
  start_date: "",
  end_date: "",
  category: "",
  status: "Upcoming",
  link: "",
  notes: "",
  is_important: false,
  owner: "turtle",
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
  const [events, setEvents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [eventLoading, setEventLoading] = useState(true);

  const [toast, setToast] = useState(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteEventConfirmId, setDeleteEventConfirmId] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [eventSubmitting, setEventSubmitting] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState("applications");

  const today = new Date();
  const [calendarMonth, setCalendarMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(
    toDateKey(today)
  );

  const filterRef = useRef(null);

  const [form, setForm] = useState(INITIAL_FORM);
  const [eventForm, setEventForm] = useState(INITIAL_EVENT_FORM);

  const [filters, setFilters] = useState({
    month: "",
    category: "",
    status: "",
    quickDate: "",
    owner: "",
  });

  useEffect(() => {
    fetchApplications();
    fetchEvents();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  function resetEventForm() {
    setEventForm(INITIAL_EVENT_FORM);
    setEditingEventId(null);
    setShowEventForm(false);
  }

  function openAddForm() {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setDeleteConfirmId(null);
    setShowForm(true);
    setShowEventForm(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openAddEventForm() {
    setEditingEventId(null);
    setEventForm(INITIAL_EVENT_FORM);
    setDeleteEventConfirmId(null);
    setShowEventForm(true);
    setShowForm(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEdit(app) {
    setEditingId(app.id);
    setDeleteConfirmId(null);
    setShowForm(true);
    setShowEventForm(false);
    setActiveTab("applications");
    setForm({
      title: app.title || "",
      deadline: app.deadline || "",
      category: app.category || "",
      status: app.status || "Planning",
      link: app.link || "",
      notes: app.notes || "",
      is_important: !!app.is_important,
      owner: app.owner || "turtle",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEditEvent(eventItem) {
    setEditingEventId(eventItem.id);
    setDeleteEventConfirmId(null);
    setShowEventForm(true);
    setShowForm(false);
    setActiveTab("events");
    setEventForm({
      title: eventItem.title || "",
      start_date: eventItem.start_date || eventItem.event_date || "",
      end_date: eventItem.end_date || eventItem.event_date || "",
      category: eventItem.category || "",
      status: eventItem.status || "Upcoming",
      link: eventItem.link || "",
      notes: eventItem.notes || "",
      is_important: !!eventItem.is_important,
      owner: eventItem.owner || "turtle",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetFilters() {
    setFilters({
      month: "",
      category: "",
      status: "",
      quickDate: "",
      owner: "",
    });
  }

  function setQuickDateFilter(value) {
    setFilters((prev) => ({
      ...prev,
      quickDate: prev.quickDate === value ? "" : value,
      month: "",
    }));
  }

  function setMonthFilter(value) {
    setFilters((prev) => ({
      ...prev,
      month: value,
      quickDate: "",
    }));
  }

  function previousCalendarMonth() {
    setCalendarMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  }

  function nextCalendarMonth() {
    setCalendarMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
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

  async function fetchEvents() {
    setEventLoading(true);

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      showToast(error.message, "error");
      setEvents([]);
    } else {
      setEvents(data || []);
    }

    setEventLoading(false);
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
      is_important: !!form.is_important,
      owner: form.owner,
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

  async function handleEventSubmit(e) {
    e.preventDefault();

    if (!eventForm.title.trim()) {
      showToast("Event title is required.", "error");
      return;
    }

    if (!eventForm.start_date) {
      showToast("Start date is required.", "error");
      return;
    }

    if (!eventForm.end_date) {
      showToast("End date is required.", "error");
      return;
    }

    if (eventForm.end_date < eventForm.start_date) {
      showToast("End date cannot be earlier than start date.", "error");
      return;
    }

    setEventSubmitting(true);

    const payload = {
      title: eventForm.title.trim(),
      start_date: eventForm.start_date,
      end_date: eventForm.end_date,
      category: eventForm.category || null,
      status: eventForm.status,
      link: eventForm.link.trim() || null,
      notes: eventForm.notes.trim() || null,
      is_important: !!eventForm.is_important,
      owner: eventForm.owner,
    };

    if (editingEventId) {
      const { error } = await supabase
        .from("events")
        .update(payload)
        .eq("id", editingEventId);

      setEventSubmitting(false);

      if (error) {
        showToast(error.message, "error");
        return;
      }

      showToast("Event updated!");
      resetEventForm();
      fetchEvents();
      return;
    }

    const { error } = await supabase.from("events").insert(payload);

    setEventSubmitting(false);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    showToast("Event added!");
    resetEventForm();
    fetchEvents();
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

  async function updateEventStatus(id, newStatus) {
    const oldEvents = events;

    setEvents((prev) =>
      prev.map((eventItem) =>
        eventItem.id === id ? { ...eventItem, status: newStatus } : eventItem
      )
    );

    const { error } = await supabase
      .from("events")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      setEvents(oldEvents);
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

  async function confirmDeleteEvent(id) {
    const wasEditing = editingEventId === id;

    const { error } = await supabase.from("events").delete().eq("id", id);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    setEvents((prev) => prev.filter((eventItem) => eventItem.id !== id));
    setDeleteEventConfirmId(null);

    if (wasEditing) {
      resetEventForm();
    }

    showToast("Event deleted");
  }

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.month) count += 1;
    if (filters.category) count += 1;
    if (filters.status) count += 1;
    if (filters.quickDate) count += 1;
    if (filters.owner) count += 1;
    return count;
  }, [filters]);

  const filteredApplications = useMemo(() => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    return applications.filter((app) => {
      const appDate = parseLocalDate(app.deadline);

      const matchesCategory = filters.category
        ? app.category === filters.category
        : true;

      const matchesStatus = filters.status ? app.status === filters.status : true;

      const matchesOwner = filters.owner ? app.owner === filters.owner : true;

      const matchesMonth = filters.month
        ? app.deadline
          ? app.deadline.startsWith(filters.month)
          : false
        : true;

      let matchesQuickDate = true;

      if (filters.quickDate) {
        if (!appDate) {
          matchesQuickDate = false;
        } else if (filters.quickDate === "overdue") {
          matchesQuickDate = appDate < todayDate;
        } else if (filters.quickDate === "today") {
          matchesQuickDate = isSameDay(appDate, todayDate);
        } else if (filters.quickDate === "this-week") {
          matchesQuickDate = isWithinThisWeek(appDate, todayDate);
        } else if (filters.quickDate === "this-month") {
          matchesQuickDate = isWithinThisMonth(appDate, todayDate);
        }
      }

      return (
        matchesCategory &&
        matchesStatus &&
        matchesOwner &&
        matchesMonth &&
        matchesQuickDate
      );
    });
  }, [applications, filters]);

  const calendarItems = useMemo(() => {
    const applicationItems = applications
      .filter((app) => !!app.deadline)
      .map((app) => ({
        ...app,
        itemType: "application",
        calendar_date: app.deadline,
      }));

    const eventItems = [];

    for (const eventItem of events) {
      const startStr = eventItem.start_date || eventItem.event_date;
      const endStr = eventItem.end_date || eventItem.event_date;

      if (!startStr || !endStr) continue;

      let current = parseLocalDate(startStr);
      const end = parseLocalDate(endStr);

      if (!current || !end) continue;

      while (current <= end) {
        eventItems.push({
          ...eventItem,
          itemType: "event",
          calendar_date: toDateKey(current),
        });

        current = new Date(current);
        current.setDate(current.getDate() + 1);
      }
    }

    return [...applicationItems, ...eventItems];
  }, [applications, events]);

  const calendarMap = useMemo(() => {
    const map = {};
    for (const item of calendarItems) {
      if (!map[item.calendar_date]) map[item.calendar_date] = [];
      map[item.calendar_date].push(item);
    }
    return map;
  }, [calendarItems]);

  const calendarDays = useMemo(() => {
    return getCalendarDays(calendarMonth);
  }, [calendarMonth]);

  const selectedDateApplications = useMemo(() => {
    return (calendarMap[selectedCalendarDate] || []).sort((a, b) =>
      (a.title || "").localeCompare(b.title || "")
    );
  }, [calendarMap, selectedCalendarDate]);

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
            Keep track of your applications, events, and deadlines
          </p>
        </header>

        <div className="mb-6 flex w-fit flex-wrap items-center gap-1 rounded-xl bg-slate-200 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("applications")}
            className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition ${
              activeTab === "applications"
                ? "bg-blue-500 text-white shadow-sm"
                : "bg-transparent text-slate-700 hover:bg-slate-100"
            }`}
          >
            Applications
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("events")}
            className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition ${
              activeTab === "events"
                ? "bg-blue-500 text-white shadow-sm"
                : "bg-transparent text-slate-700 hover:bg-slate-100"
            }`}
          >
            Events
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("calendar")}
            className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition ${
              activeTab === "calendar"
                ? "bg-blue-500 text-white shadow-sm"
                : "bg-transparent text-slate-700 hover:bg-slate-100"
            }`}
          >
            Calendar
          </button>
        </div>

        {activeTab === "applications" && (
          <>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Applications
                </h2>
                <p className="text-sm text-slate-500">
                  View and manage your application progress
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative" ref={filterRef}>
                  <button
                    type="button"
                    onClick={() => setShowFilters((prev) => !prev)}
                    className="relative flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 font-semibold text-slate-700 shadow-md transition hover:bg-slate-50"
                    title="Filters"
                  >
                    <span className="text-base">⚙️</span>
                    <span>Filters</span>
                    {activeFilterCount > 0 && (
                      <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs text-white">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  {showFilters && (
                    <div className="absolute right-0 z-30 mt-2 w-[320px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900">
                          Filters
                        </h3>
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          Reset all
                        </button>
                      </div>

                      <div className="mb-4">
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Quick Date
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { label: "Overdue", value: "overdue" },
                            { label: "Today", value: "today" },
                            { label: "This week", value: "this-week" },
                            { label: "This month", value: "this-month" },
                          ].map((item) => (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => setQuickDateFilter(item.value)}
                              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                filters.quickDate === item.value
                                  ? "bg-blue-500 text-white"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Month
                        </label>
                        <input
                          type="month"
                          value={filters.month}
                          onChange={(e) => setMonthFilter(e.target.value)}
                          className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="mt-1 text-[11px] text-slate-400">
                          Choosing a month clears the quick date filter.
                        </p>
                      </div>

                      <div className="mb-4">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Category
                        </label>
                        <select
                          value={filters.category}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              category: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">All categories</option>
                          {CATEGORY_OPTIONS.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="mb-4">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Status
                        </label>
                        <select
                          value={filters.status}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              status: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">All statuses</option>
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {STATUS_EMOJIS[status]} {status}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Owner
                        </label>
                        <select
                          value={filters.owner}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              owner: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Both people</option>
                          {OWNER_OPTIONS.map((owner) => (
                            <option key={owner.value} value={owner.value}>
                              {owner.emoji} {owner.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
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
            </div>

            {(filters.month ||
              filters.category ||
              filters.status ||
              filters.quickDate ||
              filters.owner) && (
              <div className="mb-4 flex flex-wrap gap-2">
                {filters.quickDate && (
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                    Date:{" "}
                    {filters.quickDate === "overdue"
                      ? "Overdue"
                      : filters.quickDate === "today"
                      ? "Today"
                      : filters.quickDate === "this-week"
                      ? "This week"
                      : "This month"}
                  </span>
                )}

                {filters.month && (
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800">
                    Month: {filters.month}
                  </span>
                )}

                {filters.category && (
                  <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                    Category: {filters.category}
                  </span>
                )}

                {filters.status && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Status: {filters.status}
                  </span>
                )}

                {filters.owner && (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                    Owner: {OWNER_EMOJIS[filters.owner]} {OWNER_LABELS[filters.owner]}
                  </span>
                )}
              </div>
            )}

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
                      Owner
                    </label>
                    <select
                      value={form.owner}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, owner: e.target.value }))
                      }
                      className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500"
                    >
                      {OWNER_OPTIONS.map((owner) => (
                        <option key={owner.value} value={owner.value}>
                          {owner.emoji} {owner.label}
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

                  <div className="flex items-center gap-3 pt-7">
                    <input
                      id="application-important"
                      type="checkbox"
                      checked={form.is_important}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          is_important: e.target.checked,
                        }))
                      }
                      className="h-4 w-4"
                    />
                    <label
                      htmlFor="application-important"
                      className="text-sm font-medium text-slate-600"
                    >
                      Mark as important ⭐
                    </label>
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

                  <div className="flex items-end justify-end gap-2 lg:col-span-3">
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

            <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                        Title
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                        Owner
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
                              {app.is_important ? "⭐ " : ""}
                              {app.title}
                            </div>
                          </td>

                          <td className="px-4 py-3 align-top text-sm text-slate-500">
                            <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                              {OWNER_EMOJIS[app.owner || "turtle"]}{" "}
                              {OWNER_LABELS[app.owner || "turtle"]}
                            </span>
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
                              onChange={(e) =>
                                updateStatus(app.id, e.target.value)
                              }
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

              {!loading &&
                filteredApplications.length === 0 &&
                applications.length > 0 && (
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
                  ⚠️ Maximum limit of 999 applications reached. Please delete
                  some to add more.
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "events" && (
          <>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Events</h2>
                <p className="text-sm text-slate-500">
                  Manage your meetings, workshops, deadlines, and personal events
                </p>
              </div>

              {!showEventForm && (
                <button
                  type="button"
                  onClick={openAddEventForm}
                  className="w-fit rounded-lg bg-blue-500 px-5 py-2.5 font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-blue-600"
                >
                  + Add Event
                </button>
              )}
            </div>

            {showEventForm && (
              <div className="mb-8 rounded-2xl bg-white p-6 shadow-lg">
                <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <h3 className="text-xl font-semibold text-slate-900">
                    {editingEventId ? "Edit Event" : "Add New Event"}
                  </h3>

                  <button
                    type="button"
                    onClick={resetEventForm}
                    className="w-fit rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
                  >
                    {editingEventId ? "Cancel Edit" : "Close"}
                  </button>
                </div>

                <form
                  onSubmit={handleEventSubmit}
                  className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
                >
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-500">
                      Event Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={eventForm.title}
                      onChange={(e) =>
                        setEventForm((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-500">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={eventForm.start_date}
                      onChange={(e) =>
                        setEventForm((prev) => ({
                          ...prev,
                          start_date: e.target.value,
                          end_date: prev.end_date || e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-500">
                      End Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={eventForm.end_date}
                      min={eventForm.start_date || undefined}
                      onChange={(e) =>
                        setEventForm((prev) => ({
                          ...prev,
                          end_date: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-500">
                      Category
                    </label>
                    <select
                      value={eventForm.category}
                      onChange={(e) =>
                        setEventForm((prev) => ({
                          ...prev,
                          category: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a category</option>
                      {EVENT_CATEGORY_OPTIONS.map((category) => (
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
                      value={eventForm.status}
                      onChange={(e) =>
                        setEventForm((prev) => ({
                          ...prev,
                          status: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500"
                    >
                      {EVENT_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {EVENT_STATUS_EMOJIS[status]} {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-500">
                      Owner
                    </label>
                    <select
                      value={eventForm.owner}
                      onChange={(e) =>
                        setEventForm((prev) => ({
                          ...prev,
                          owner: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500"
                    >
                      {OWNER_OPTIONS.map((owner) => (
                        <option key={owner.value} value={owner.value}>
                          {owner.emoji} {owner.label}
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
                      value={eventForm.link}
                      onChange={(e) =>
                        setEventForm((prev) => ({
                          ...prev,
                          link: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-7">
                    <input
                      id="event-important"
                      type="checkbox"
                      checked={eventForm.is_important}
                      onChange={(e) =>
                        setEventForm((prev) => ({
                          ...prev,
                          is_important: e.target.checked,
                        }))
                      }
                      className="h-4 w-4"
                    />
                    <label
                      htmlFor="event-important"
                      className="text-sm font-medium text-slate-600"
                    >
                      Mark as important ⭐
                    </label>
                  </div>

                  <div className="lg:col-span-3">
                    <label className="mb-1 block text-sm font-medium text-slate-500">
                      Notes
                    </label>
                    <textarea
                      value={eventForm.notes}
                      onChange={(e) =>
                        setEventForm((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      rows={6}
                      className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-end justify-end gap-2 lg:col-span-3">
                    <button
                      type="button"
                      onClick={resetEventForm}
                      className="rounded-lg bg-slate-200 px-5 py-2.5 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-300"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={eventSubmitting}
                      className="rounded-lg bg-blue-500 px-6 py-2.5 font-semibold text-white shadow-md transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {eventSubmitting
                        ? editingEventId
                          ? "Saving..."
                          : "Adding..."
                        : editingEventId
                        ? "Save Changes"
                        : "Add Event"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                        Title
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                        Owner
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                        Event Dates
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
                    {!eventLoading &&
                      events.map((eventItem) => (
                        <tr
                          key={eventItem.id}
                          className="border-b border-slate-700/20"
                        >
                          <td className="px-4 py-3 align-top">
                            <div className="font-medium text-slate-900">
                              {eventItem.is_important ? "⭐ " : ""}
                              {eventItem.title}
                            </div>
                          </td>

                          <td className="px-4 py-3 align-top text-sm text-slate-500">
                            <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                              {OWNER_EMOJIS[eventItem.owner || "turtle"]}{" "}
                              {OWNER_LABELS[eventItem.owner || "turtle"]}
                            </span>
                          </td>

                          <td className="px-4 py-3 align-top text-sm text-slate-500">
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                              {eventItem.category || "—"}
                            </span>
                          </td>

                          <td className="px-4 py-3 align-top text-sm text-slate-500">
                            {formatDateRange(
                              eventItem.start_date || eventItem.event_date,
                              eventItem.end_date || eventItem.event_date
                            )}
                          </td>

                          <td className="px-4 py-3 align-top">
                            <select
                              value={eventItem.status}
                              onChange={(e) =>
                                updateEventStatus(eventItem.id, e.target.value)
                              }
                              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold outline-none ${EVENT_STATUS_COLORS[eventItem.status]}`}
                            >
                              {EVENT_STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {EVENT_STATUS_EMOJIS[status]} {status}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="px-4 py-3 align-top">
                            <NotesCell notes={eventItem.notes} />
                          </td>

                          <td className="px-4 py-3 align-top">
                            {eventItem.link ? (
                              <a
                                href={eventItem.link}
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
                            {deleteEventConfirmId === eventItem.id ? (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => confirmDeleteEvent(eventItem.id)}
                                  className="rounded bg-red-500 px-3 py-1 text-xs font-semibold text-white"
                                >
                                  Delete?
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteEventConfirmId(null)}
                                  className="rounded bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEditEvent(eventItem)}
                                  className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-200"
                                  title="Edit"
                                >
                                  ✏️
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteEventConfirmId(eventItem.id)
                                  }
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

              {!eventLoading && events.length === 0 && (
                <div className="p-12 text-center">
                  <div className="mb-4 text-5xl">📅</div>
                  <h3 className="mb-2 text-xl font-semibold text-slate-900">
                    No events yet
                  </h3>
                  <p className="text-slate-500">
                    Click the Add Event button to get started!
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "calendar" && (
          <>
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-slate-900">Calendar</h2>
              <p className="text-sm text-slate-500">
                See all application deadlines and events in one calendar
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_0.8fr]">
              <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 md:px-6">
                  <button
                    type="button"
                    onClick={previousCalendarMonth}
                    className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                  >
                    ← Prev
                  </button>

                  <h3 className="text-lg font-bold text-slate-900">
                    {getMonthName(calendarMonth)}
                  </h3>

                  <button
                    type="button"
                    onClick={nextCalendarMonth}
                    className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                  >
                    Next →
                  </button>
                </div>

                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100">
                  {WEEKDAY_LABELS.map((label) => (
                    <div
                      key={label}
                      className="px-2 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500"
                    >
                      {label}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7">
                  {calendarDays.map(({ date, isCurrentMonth }) => {
                    const dateKey = toDateKey(date);
                    const dayItems = calendarMap[dateKey] || [];
                    const isToday = isSameDay(date, new Date());
                    const isSelected = selectedCalendarDate === dateKey;

                    return (
                      <button
                        key={dateKey}
                        type="button"
                        onClick={() => setSelectedCalendarDate(dateKey)}
                        className={`min-h-[118px] border border-slate-100 p-2 text-left transition hover:bg-blue-50 ${
                          isSelected
                            ? "bg-blue-50 ring-2 ring-inset ring-blue-400"
                            : "bg-white"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                              isToday
                                ? "bg-blue-500 text-white"
                                : isCurrentMonth
                                ? "text-slate-800"
                                : "text-slate-300"
                            }`}
                          >
                            {date.getDate()}
                          </span>

                          {dayItems.length > 0 && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                              {dayItems.length}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1">
                          {dayItems.slice(0, 3).map((item) => (
                            <div
                              key={`${item.itemType}-${item.id}-${item.calendar_date}`}
                              className="truncate rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-700"
                              title={item.title}
                            >
                              <span
                                className={`mr-1 inline-block h-2 w-2 rounded-full ${
                                  item.itemType === "application"
                                    ? STATUS_DOT_COLORS[item.status] || "bg-slate-400"
                                    : EVENT_STATUS_DOT_COLORS[item.status] ||
                                      "bg-slate-400"
                                }`}
                              />
                              {OWNER_EMOJIS[item.owner || "turtle"]}{" "}
                              {item.is_important ? "⭐ " : ""}
                              {item.title}
                            </div>
                          ))}

                          {dayItems.length > 3 && (
                            <div className="text-[11px] font-semibold text-blue-600">
                              +{dayItems.length - 3} more
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-lg">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-slate-900">
                    {selectedCalendarDate
                      ? formatDate(selectedCalendarDate)
                      : "Selected date"}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Applications and events on this date
                  </p>
                </div>

                {selectedDateApplications.length === 0 ? (
                  <div className="rounded-xl bg-slate-50 p-6 text-center">
                    <div className="mb-2 text-3xl">📅</div>
                    <p className="text-sm text-slate-500">
                      No items on this date.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDateApplications.map((item) => (
                      <div
                        key={`${item.itemType}-${item.id}-${item.calendar_date}`}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-slate-900">
                              {OWNER_EMOJIS[item.owner || "turtle"]}{" "}
                              {item.is_important ? "⭐ " : ""}
                              {item.title}
                            </h4>
                            <p className="mt-1 text-xs text-slate-500">
                              <span className="font-semibold">
                                {item.itemType === "application"
                                  ? "Application"
                                  : "Event"}
                              </span>
                              {" • "}
                              {OWNER_LABELS[item.owner || "turtle"]}
                              {" • "}
                              {item.category || "No category"}
                              {item.itemType === "event" && (
                                <>
                                  {" • "}
                                  {formatDateRange(
                                    item.start_date || item.event_date,
                                    item.end_date || item.event_date
                                  )}
                                </>
                              )}
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              item.itemType === "application"
                                ? STATUS_COLORS[item.status]
                                : EVENT_STATUS_COLORS[item.status]
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>

                        {item.notes && (
                          <p className="mb-3 whitespace-pre-wrap text-sm text-slate-600">
                            {item.notes}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              item.itemType === "application"
                                ? startEdit(item)
                                : startEditEvent(item)
                            }
                            className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-200"
                          >
                            Edit
                          </button>

                          {item.link && (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-200"
                            >
                              Open Link
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
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