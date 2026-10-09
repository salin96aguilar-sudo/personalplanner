import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, Dispatch, ReactNode, SetStateAction } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

type Page = "Dashboard" | "Calendar" | "My Day" | "Tasks" | "Notes" | "Goals" | "Settings";
type Priority = "Low" | "Medium" | "High";
type Task = { id: string; title: string; dueDate: string; dueTime: string; priority: Priority; category: string; done: boolean };
type EventItem = { id: string; date: string; start: string; end: string; title: string; category: string; location: string; description: string };
type Note = { id: string; title: string; content: string; category: string; updatedAt: string; tags: string[] };
type Goal = { id: string; name: string; description: string; dueDate: string; current: number; target: number; unit: string; category: string };
type PlannerData = {
  tasks: Task[];
  events: EventItem[];
  notes: Note[];
  goals: Goal[];
  dayNote: string;
  settings: { name: string; dark: boolean; accent: string; avatar?: string };
};
type Notice = { title: string; detail: string; color: string; icon: string };
type Setter<T> = Dispatch<SetStateAction<T>>;

const STORAGE_KEY = "personal-planner-data-v1";
const accentColors: Record<string, string> = { navy: "#132342", blue: "#4f8ef7", purple: "#9270db", green: "#39a56e", amber: "#e5a83d" };
const categories: Record<string, string> = { Work: "blue", Personal: "purple", Health: "green", Study: "amber", Important: "red", Finance: "cyan" };
const categoryNames = Object.keys(categories);
const navItems: { label: Page; icon: string }[] = [
  { label: "Dashboard", icon: "grid" }, { label: "Calendar", icon: "calendar" },
  { label: "My Day", icon: "sun" }, { label: "Tasks", icon: "check" },
  { label: "Notes", icon: "note" }, { label: "Goals", icon: "target" },
  { label: "Settings", icon: "settings" },
];

const iconPaths: Record<string, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></>,
  check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.7 2.7L16.5 9"/></>,
  note: <><path d="M5 3h11l3 3v15H5z"/><path d="M15 3v4h4M8 11h8M8 15h6"/></>,
  target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1v.1h-4v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4h-.1v-4H3A1.7 1.7 0 0 0 4.6 8a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1v-.1h4V3a1.7 1.7 0 0 0 1.1 1.6 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.16.38.37.72.6 1 .26.3.62.4 1 .4h.1v4H21a1.7 1.7 0 0 0-1.6.6Z"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7M10 20h4"/></>,
  plus: <path d="M12 5v14M5 12h14"/>, menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>, chevronLeft: <path d="m15 18-6-6 6-6"/>,
  chevronRight: <path d="m9 18 6-6-6-6"/>, more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  pin: <><circle cx="12" cy="10" r="3"/><path d="M18 10c0 5-6 11-6 11S6 15 6 10a6 6 0 1 1 12 0Z"/></>,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5"/>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/></>,
};

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{iconPaths[name] ?? iconPaths.note}</svg>;
}

function Button({ children, variant = "primary", icon, onClick, className = "", type = "button" }: {
  children?: ReactNode; variant?: "primary" | "secondary" | "ghost" | "danger"; icon?: string; onClick?: () => void; className?: string; type?: "button" | "submit";
}) {
  return <button type={type} onClick={onClick} className={`btn btn-${variant} ${className}`}>{icon && <Icon name={icon} size={18}/>} {children}</button>;
}

function Badge({ children, color = "gray" }: { children: ReactNode; color?: string }) {
  return <span className={`badge badge-${color}`}>{children}</span>;
}

function Progress({ value, color = "blue" }: { value: number; color?: string }) {
  return <div className="progress"><span className={`progress-${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }}/></div>;
}

function localDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function offsetDate(days: number, from = new Date()): string {
  const result = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);
  return localDate(result);
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDate(date: string, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }, locale = "en-US"): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Intl.DateTimeFormat(locale, options).format(new Date(year, month - 1, day));
}

function formatTime(time: string, locale = "en-US"): string {
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, hours, minutes));
}

function resizeProfileImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) return Promise.reject(new Error("Choose an image file."));
  if (file.size > 10 * 1024 * 1024) return Promise.reject(new Error("Choose an image smaller than 10 MB."));

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read this image."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Could not open this image."));
      image.onload = () => {
        const scale = Math.min(1, 512 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Could not process this image."));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function createInitialData(): PlannerData {
  const today = new Date();
  const eventOffsets = [-5, -3, 0, 0, 4, 7, 11, 15, 20];
  const eventSeeds = [
    ["Team stand-up", "Work", "09:00"], ["Dentist", "Health", "11:30"], ["Product review", "Work", "10:00"],
    ["Coffee with Sofia", "Personal", "15:00"], ["Morning run", "Health", "08:00"], ["Finance check-in", "Finance", "13:00"],
    ["Family dinner", "Personal", "18:00"], ["Design workshop", "Study", "14:00"], ["Monthly planning", "Important", "09:30"],
  ];
  const notes: Note[] = [
    { id: createId(), title: "Ideas for Q4", content: "Explore new ways to simplify our weekly planning process and team rituals.", category: "Work", updatedAt: new Date().toISOString(), tags: ["ideas", "planning"] },
    { id: createId(), title: "Books to read", content: "The Creative Act, Four Thousand Weeks, and Build.", category: "Personal", updatedAt: new Date(Date.now() - 86400000).toISOString(), tags: ["reading"] },
    { id: createId(), title: "Meeting notes", content: "Focus the next sprint on onboarding improvements and performance.", category: "Work", updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(), tags: ["meeting", "product"] },
  ];
  return {
    tasks: [
      { id: createId(), title: "Review quarterly roadmap", dueDate: offsetDate(0, today), dueTime: "10:00", priority: "High", category: "Work", done: false },
      { id: createId(), title: "Book dentist appointment", dueDate: offsetDate(0, today), dueTime: "14:00", priority: "Medium", category: "Health", done: false },
      { id: createId(), title: "Send project update to team", dueDate: offsetDate(0, today), dueTime: "16:30", priority: "High", category: "Work", done: true },
      { id: createId(), title: "Read 20 pages", dueDate: offsetDate(1, today), dueTime: "", priority: "Low", category: "Study", done: false },
      { id: createId(), title: "Plan monthly budget", dueDate: offsetDate(4, today), dueTime: "", priority: "Medium", category: "Finance", done: false },
    ],
    events: eventSeeds.map(([title, category, start], index) => {
      const eventDate = offsetDate(eventOffsets[index], today);
      const startHour = Number(start.slice(0, 2));
      return { id: createId(), date: eventDate, start, end: `${String((startHour + 1) % 24).padStart(2, "0")}:${start.slice(3)}`, title, category, location: "", description: "" };
    }),
    notes,
    goals: [
      { id: createId(), name: "Run a half marathon", description: "Build endurance with a consistent training plan.", dueDate: localDate(new Date(today.getFullYear(), today.getMonth() + 2, 14)), current: 24, target: 36, unit: "runs", category: "Health" },
      { id: createId(), name: "Complete product course", description: "Finish the advanced product strategy certification.", dueDate: offsetDate(53, today), current: 9, target: 11, unit: "modules", category: "Study" },
      { id: createId(), name: "Build emergency fund", description: "Save three months of essential expenses.", dueDate: localDate(new Date(today.getFullYear() + (today.getMonth() > 2 ? 1 : 0), 2, 1)), current: 5400, target: 12000, unit: "dollars", category: "Finance" },
      { id: createId(), name: "Read 24 books", description: "Two thoughtful books every month.", dueDate: localDate(new Date(today.getFullYear(), 11, 31)), current: 18, target: 24, unit: "books", category: "Personal" },
    ],
    dayNote: "Remember to ask about the onboarding metrics in the product meeting.\n\nPick up groceries on the way home.",
    settings: { name: "Adolfo Molina", dark: false, accent: "blue" },
  };
}

function isPlannerData(value: unknown): value is PlannerData {
  if (typeof value !== "object" || value === null) return false;
  const data = value as Partial<PlannerData>;
  return Array.isArray(data.tasks) && Array.isArray(data.events) && Array.isArray(data.notes) &&
    Array.isArray(data.goals) && typeof data.dayNote === "string" && typeof data.settings?.name === "string" &&
    typeof data.settings.dark === "boolean" && typeof data.settings.accent === "string";
}

function loadPlannerData(): PlannerData {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return createInitialData();
    const parsed: unknown = JSON.parse(stored);
    if (isPlannerData(parsed)) return parsed;
    console.error("Saved planner data is invalid; starting with a fresh planner.");
  } catch (error) {
    console.error("Could not read saved planner data.", error);
  }
  return createInitialData();
}

function App() {
  const [data, setData] = useState<PlannerData>(loadPlannerData);
  const [page, setPage] = useState<Page>("Dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [eventModal, setEventModal] = useState(false);
  const [noteModal, setNoteModal] = useState(false);
  const [taskModal, setTaskModal] = useState(false);
  const [goalModal, setGoalModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedDate, setSelectedDate] = useState(localDate(new Date()));
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [noteQuery, setNoteQuery] = useState("");
  const [quickTask, setQuickTask] = useState("");
  const [monthOffset, setMonthOffset] = useState(0);
  const [calendarView, setCalendarView] = useState("Month");
  const [taskFilter, setTaskFilter] = useState("All");
  const toastTimer = useRef<number | undefined>(undefined);
  const navigationState = useRef({ page, eventModal, noteModal, taskModal, goalModal, searchOpen, notificationsOpen, mobileMoreOpen });
  navigationState.current = { page, eventModal, noteModal, taskModal, goalModal, searchOpen, notificationsOpen, mobileMoreOpen };
  const today = localDate(new Date());
  const locale = "en-US";
  const accent = accentColors[data.settings.accent] ?? accentColors.blue;
  const appStyle = { "--blue": accent, "--blue-soft": `${accent}20` } as CSSProperties;

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Could not save planner data.", error);
      setToast("Your browser could not save these changes.");
    }
  }, [data]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setMobileMoreOpen(false);
        setEventModal(false);
        setNoteModal(false);
        setTaskModal(false);
        setGoalModal(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;
    let cancelled = false;
    let removeListener: (() => void) | undefined;
    CapacitorApp.addListener("backButton", () => {
      const current = navigationState.current;
      if (current.eventModal) {
        setEventModal(false);
        setEditingEvent(null);
      } else if (current.noteModal) {
        setNoteModal(false);
        setEditingNote(null);
      } else if (current.taskModal) {
        setTaskModal(false);
        setEditingTask(null);
      } else if (current.goalModal) {
        setGoalModal(false);
        setEditingGoal(null);
      } else if (current.searchOpen) {
        setSearchOpen(false);
        setQuery("");
      } else if (current.notificationsOpen) {
        setNotificationsOpen(false);
      } else if (current.mobileMoreOpen) {
        setMobileMoreOpen(false);
      } else if (current.page !== "Dashboard") {
        setPage("Dashboard");
      } else {
        void CapacitorApp.exitApp().catch(error => console.error("Could not close the Android app.", error));
      }
    }).then(listener => {
      if (cancelled) {
        void listener.remove().catch(error => console.error("Could not remove the Android back-button listener.", error));
      } else {
        removeListener = () => { void listener.remove().catch(error => console.error("Could not remove the Android back-button listener.", error)); };
      }
    }).catch(error => console.error("Could not register the Android back-button listener.", error));
    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, []);

  const notify = (message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2600);
  };
  const update = (key: "tasks" | "events" | "notes" | "goals", value: PlannerData[typeof key]) => {
    setData(current => ({ ...current, [key]: value }));
  };
  const navigate = (next: Page) => { setPage(next); setSearchOpen(false); setMobileMoreOpen(false); };
  const addTask = () => {
    const title = quickTask.trim();
    if (!title) return;
    update("tasks", [{ id: createId(), title, dueDate: today, dueTime: "", priority: "Medium", category: "Personal", done: false }, ...data.tasks]);
    setQuickTask("");
    notify("Task added");
  };
  const saveTask = (task: Task) => {
    const exists = data.tasks.some(item => item.id === task.id);
    update("tasks", exists ? data.tasks.map(item => item.id === task.id ? task : item) : [task, ...data.tasks]);
    setTaskModal(false);
    setEditingTask(null);
    notify(exists ? "Task updated" : "Task added");
  };
  const toggleTask = (id: string) => update("tasks", data.tasks.map(task => task.id === id ? { ...task, done: !task.done } : task));
  const deleteTask = (id: string) => {
    if (!window.confirm("Delete this task?")) return;
    update("tasks", data.tasks.filter(task => task.id !== id));
    setTaskModal(false);
    setEditingTask(null);
    notify("Task deleted");
  };
  const saveEvent = (event: EventItem) => {
    const exists = data.events.some(item => item.id === event.id);
    update("events", exists ? data.events.map(item => item.id === event.id ? event : item) : [...data.events, event]);
    setEventModal(false);
    setEditingEvent(null);
    notify(exists ? "Event updated" : "Event added to calendar");
  };
  const deleteEvent = (id: string) => {
    if (!window.confirm("Delete this event?")) return;
    update("events", data.events.filter(event => event.id !== id));
    setEventModal(false);
    setEditingEvent(null);
    notify("Event deleted");
  };
  const saveNote = (note: Note) => {
    const exists = data.notes.some(item => item.id === note.id);
    update("notes", exists ? data.notes.map(item => item.id === note.id ? note : item) : [note, ...data.notes]);
    setNoteModal(false);
    setEditingNote(null);
    notify(exists ? "Note updated" : "Note created");
  };
  const deleteNote = (id: string) => {
    if (!window.confirm("Delete this note?")) return;
    update("notes", data.notes.filter(note => note.id !== id));
    setNoteModal(false);
    setEditingNote(null);
    notify("Note deleted");
  };
  const saveGoal = (goal: Goal) => {
    const exists = data.goals.some(item => item.id === goal.id);
    update("goals", exists ? data.goals.map(item => item.id === goal.id ? goal : item) : [goal, ...data.goals]);
    setGoalModal(false);
    setEditingGoal(null);
    notify(exists ? "Goal updated" : "Goal created");
  };
  const deleteGoal = (id: string) => {
    if (!window.confirm("Delete this goal?")) return;
    update("goals", data.goals.filter(goal => goal.id !== id));
    setGoalModal(false);
    setEditingGoal(null);
    notify("Goal deleted");
  };
  const notifications = useMemo<Notice[]>(() => [
    ...data.events.filter(event => event.date === today).map(event => ({ title: event.title, detail: `Today at ${formatTime(event.start, locale)}`, color: categories[event.category] ?? "blue", icon: "calendar" })),
    ...data.tasks.filter(task => !task.done && task.dueDate === today).map(task => ({ title: task.title, detail: task.dueTime ? `Task due at ${formatTime(task.dueTime, locale)}` : "Task due today", color: "red", icon: "check" })),
    ...data.goals.filter(goal => goal.dueDate === today).map(goal => ({ title: goal.name, detail: "Goal deadline is today", color: "green", icon: "target" })),
  ].slice(0, 6), [data.events, data.goals, data.tasks, today]);
  const mobileAction = page === "Tasks" ? "Add task" : page === "Notes" ? "Add note" : page === "Goals" ? "Add goal" : page === "Settings" ? null : "Add event";
  const openMobileAction = () => {
    if (page === "Tasks") {
      setEditingTask(null);
      setTaskModal(true);
    } else if (page === "Notes") {
      setEditingNote(null);
      setNoteModal(true);
    } else if (page === "Goals") {
      setEditingGoal(null);
      setGoalModal(true);
    } else {
      if (page !== "Calendar") setSelectedDate(today);
      setEditingEvent(null);
      setEventModal(true);
    }
  };

  return (
    <div className={data.settings.dark ? "app dark" : "app"} style={appStyle}>
      <aside className={collapsed ? "sidebar collapsed" : "sidebar"}>
        <div className="brand"><div className="brand-mark"><Icon name="check" size={21}/></div><span>Personal Planner</span></div>
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)} aria-label="Collapse sidebar"><Icon name={collapsed ? "chevronRight" : "chevronLeft"} size={16}/></button>
        <nav>{navItems.map(item => <button key={item.label} className={page === item.label ? "nav-item active" : "nav-item"} onClick={() => navigate(item.label)}><Icon name={item.icon}/><span>{item.label}</span>{item.label === "Tasks" && <small>{data.tasks.filter(task => !task.done).length}</small>}</button>)}</nav>
        <div className="sidebar-footer">
          <div className="date-card"><Icon name="calendar" size={18}/><div><b>{formatDate(today, { weekday: "long" }, locale)}</b><span>{formatDate(today, { month: "long", day: "numeric", year: "numeric" }, locale)}</span></div></div>
          <button className="profile" onClick={() => navigate("Settings")}><Avatar name={data.settings.name} photo={data.settings.avatar}/><div><b>{data.settings.name}</b><span>Personal workspace</span></div><Icon name="more" size={18}/></button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle menu"><Icon name="menu"/></button>
          <div className="mobile-brand"><div className="brand-mark"><Icon name="check" size={18}/></div><div><span>Personal Planner</span><b>{page}</b></div></div>
          <button className="top-search" onClick={() => setSearchOpen(true)}><Icon name="search" size={18}/><span>Search anything...</span><kbd>⌘ K</kbd></button>
          <div className="top-actions">
            <button className="icon-btn" onClick={() => setSearchOpen(true)} aria-label="Search"><Icon name="search"/></button>
            <button className="icon-btn notification-btn" onClick={() => setNotificationsOpen(!notificationsOpen)} aria-label="Notifications"><Icon name="bell"/>{notifications.length > 0 && <i/>}</button>
            <Button icon="plus" onClick={() => { setEditingEvent(null); setSelectedDate(today); setEventModal(true); }}>Add</Button>
          </div>
          {notificationsOpen && <NotificationPanel notices={notifications} close={() => setNotificationsOpen(false)}/>}
        </header>

        <div className="content">
          {page === "Dashboard" && <Dashboard data={data} today={today} navigate={navigate} openEvent={() => { setEditingEvent(null); setSelectedDate(today); setEventModal(true); }} locale={locale}/>}
          {page === "Calendar" && <Calendar events={data.events} openAdd={(date = selectedDate) => { setEditingEvent(null); setSelectedDate(date); setEventModal(true); }} editEvent={event => { setEditingEvent(event); setEventModal(true); }} monthOffset={monthOffset} setMonthOffset={setMonthOffset} view={calendarView} setView={setCalendarView} selectedDate={selectedDate} setSelectedDate={setSelectedDate} locale={locale}/>}
          {page === "Tasks" && <Tasks tasks={data.tasks} quickTask={quickTask} setQuickTask={setQuickTask} addTask={addTask} toggleTask={toggleTask} filter={taskFilter} setFilter={setTaskFilter} openAdd={() => { setEditingTask(null); setTaskModal(true); }} editTask={task => { setEditingTask(task); setTaskModal(true); }} deleteTask={deleteTask} locale={locale}/>}
          {page === "My Day" && <MyDay data={data} today={today} toggleTask={toggleTask} setDayNote={value => setData(current => ({ ...current, dayNote: value }))} openEvent={event => { setEditingEvent(event ?? null); setSelectedDate(event?.date ?? today); setEventModal(true); }} locale={locale}/>}
          {page === "Notes" && <Notes notes={data.notes} query={noteQuery} setQuery={setNoteQuery} openAdd={() => { setEditingNote(null); setNoteModal(true); }} editNote={note => { setEditingNote(note); setNoteModal(true); }} deleteNote={deleteNote} locale={locale}/>}
          {page === "Goals" && <Goals goals={data.goals} setGoals={goals => update("goals", goals)} openAdd={() => { setEditingGoal(null); setGoalModal(true); }} editGoal={goal => { setEditingGoal(goal); setGoalModal(true); }} locale={locale}/>}
          {page === "Settings" && <Settings settings={data.settings} onSave={settings => { setData(current => ({ ...current, settings })); notify("Settings saved"); }} onExport={() => exportData(data)} onReset={() => { if (window.confirm("Reset the planner and remove all saved changes?")) { setData(createInitialData()); notify("Planner reset"); } }}/>}
        </div>
      </main>

      <nav className="bottom-nav">
        {navItems.slice(0, 4).map(item => <button key={item.label} className={page === item.label ? "active" : ""} onClick={() => navigate(item.label)}><Icon name={item.icon}/><span>{item.label === "Dashboard" ? "Home" : item.label}</span></button>)}
        <button className={["Notes", "Goals", "Settings"].includes(page) || mobileMoreOpen ? "active" : ""} onClick={() => setMobileMoreOpen(true)}><Icon name="menu"/><span>More</span></button>
      </nav>
      {mobileMoreOpen && <div className="mobile-sheet-backdrop" onClick={() => setMobileMoreOpen(false)}><div className="mobile-sheet" onClick={event => event.stopPropagation()}><div className="sheet-handle"/><div className="sheet-profile"><Avatar name={data.settings.name} photo={data.settings.avatar}/><div><b>{data.settings.name}</b><span>Personal workspace</span></div><button onClick={() => setMobileMoreOpen(false)}><Icon name="close"/></button></div><div className="sheet-links">{navItems.slice(4).map(item => <button key={item.label} onClick={() => navigate(item.label)}><div className="icon-tile blue"><Icon name={item.icon}/></div><span>{item.label}</span><Icon name="chevronRight" size={18}/></button>)}</div></div></div>}
      {eventModal && <EventModal event={editingEvent} initialDate={selectedDate} close={() => { setEventModal(false); setEditingEvent(null); }} save={saveEvent} onDelete={deleteEvent}/>}
      {noteModal && <NoteModal note={editingNote} close={() => { setNoteModal(false); setEditingNote(null); }} save={saveNote} onDelete={deleteNote}/>}
      {taskModal && <TaskModal task={editingTask} close={() => { setTaskModal(false); setEditingTask(null); }} save={saveTask} onDelete={deleteTask}/>}
      {goalModal && <GoalModal goal={editingGoal} close={() => { setGoalModal(false); setEditingGoal(null); }} save={saveGoal} onDelete={deleteGoal}/>}
      {searchOpen && <SearchModal query={query} setQuery={setQuery} tasks={data.tasks} events={data.events} notes={data.notes} goals={data.goals} close={() => { setSearchOpen(false); setQuery(""); }} navigate={navigate}/>}
      {toast && <div className="toast"><span><Icon name="check" size={18}/></span>{toast}</div>}
      {mobileAction && <button className="mobile-fab" onClick={openMobileAction} aria-label={mobileAction}><Icon name="plus"/></button>}
    </div>
  );
}

function Dashboard({ data, today, navigate, openEvent, locale }: { data: PlannerData; today: string; navigate: (page: Page) => void; openEvent: () => void; locale: string }) {
  const todayTasks = data.tasks.filter(task => task.dueDate === today);
  const completed = todayTasks.filter(task => task.done).length;
  const todayEvents = data.events.filter(event => event.date === today).sort((a, b) => a.start.localeCompare(b.start));
  const nextEvent = todayEvents.find(event => event.start >= `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`) ?? todayEvents[0];
  const averageGoal = data.goals.length ? Math.round(data.goals.reduce((sum, goal) => sum + Math.min(100, goal.current / Math.max(goal.target, 1) * 100), 0) / data.goals.length) : 0;
  const upcoming = data.events.filter(event => event.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)).slice(0, 5);
  const quickNote = data.notes[0];
  return <div className="page">
    <div className="page-heading dashboard-heading"><div><p className="eyebrow">{formatDate(today, { weekday: "long", month: "long", day: "numeric" }, locale).toUpperCase()}</p><h1>Good day, {data.settings.name.split(" ")[0]}</h1><p>Make space for what matters today.</p></div><Button icon="plus" onClick={openEvent}>Add new</Button></div>
    <section className="overview-grid">
      <article className="card summary-card featured"><div className="card-top"><div className="icon-tile blue"><Icon name="check"/></div><button className="ghost-more" onClick={() => navigate("Tasks")} aria-label="Open tasks"><Icon name="more"/></button></div><span className="label">TODAY'S TASKS</span><div className="big-stat">{completed}<small> / {todayTasks.length} completed</small></div><Progress value={todayTasks.length ? completed / todayTasks.length * 100 : 0}/><div className="card-meta"><span>{todayTasks.length - completed} remaining</span><button onClick={() => navigate("Tasks")}>View tasks <Icon name="arrow" size={14}/></button></div></article>
      <article className="card summary-card"><div className="card-top"><div className="icon-tile purple"><Icon name="calendar"/></div><Badge color="purple">{todayEvents.length} today</Badge></div><span className="label">NEXT EVENT</span><div className="event-preview"><b>{nextEvent?.title ?? "No upcoming events"}</b><span><Icon name="clock" size={14}/>{nextEvent ? `${formatTime(nextEvent.start, locale)}${nextEvent.end ? ` – ${formatTime(nextEvent.end, locale)}` : ""}` : "Add an event to get started"}</span></div><button className="text-action" onClick={() => navigate("Calendar")}>Open calendar <Icon name="arrow" size={14}/></button></article>
      <article className="card summary-card"><div className="card-top"><div className="icon-tile green"><Icon name="target"/></div><span className="trend">{data.goals.length ? "In progress" : "Get started"}</span></div><span className="label">GOALS PROGRESS</span><div className="big-stat">{averageGoal}<small>% average</small></div><Progress value={averageGoal} color="green"/><div className="card-meta"><span>{data.goals.length} active goals</span><button onClick={() => navigate("Goals")}>See goals <Icon name="arrow" size={14}/></button></div></article>
      <article className="card summary-card note-summary"><div className="card-top"><div className="icon-tile amber"><Icon name="note"/></div><button className="ghost-more" onClick={() => navigate("Notes")} aria-label="Open notes"><Icon name="more"/></button></div><span className="label">QUICK NOTE</span><b>{quickNote?.title ?? "No notes yet"}</b><p>{quickNote?.content ?? "Capture your first idea."}</p><button onClick={() => navigate("Notes")}>Open notes <Icon name="arrow" size={14}/></button></article>
    </section>
    <section className="dashboard-lower">
      <article className="card schedule-card"><div className="section-heading"><div><h2>Upcoming schedule</h2><p>Your next events at a glance</p></div><Button variant="ghost" onClick={() => navigate("Calendar")}>Full calendar <Icon name="arrow" size={16}/></Button></div>
        <div className="timeline">{upcoming.length ? upcoming.map((event, index) => <div className="timeline-row" key={event.id}><time>{event.date === today ? formatTime(event.start, locale) : formatDate(event.date, { month: "short", day: "numeric" }, locale)}</time><div className={`timeline-dot ${categories[event.category] ?? "blue"}`}/><button className="timeline-event" onClick={() => navigate("Calendar")}><div><b>{event.title}</b><span>{event.category}{event.date === today ? ` · ${formatTime(event.start, locale)}` : ""}</span></div>{index === 0 && <Badge color="blue">Next up</Badge>}<Icon name="more" size={18}/></button></div>) : <div className="empty-state"><Icon name="calendar" size={30}/><b>Your schedule is clear</b><Button variant="secondary" onClick={openEvent}>Add an event</Button></div>}</div>
      </article>
      <aside className="right-column"><article className="card focus-card"><div className="section-heading"><div><h2>Today's focus</h2><p>Your top priorities</p></div><span className="count">{data.tasks.filter(task => !task.done).length}</span></div>
        {data.tasks.filter(task => !task.done).slice(0, 3).map((task, index) => <button className="focus-item" key={task.id} onClick={() => navigate("Tasks")}><span>{index + 1}</span><div><b>{task.title}</b><small>{task.category} · {formatDate(task.dueDate, { month: "short", day: "numeric" }, locale)}</small></div></button>)}
      </article><article className="quote-card"><Icon name="sun" size={26}/><p>“Success is the sum of small efforts, repeated day in and day out.”</p><span>— Robert Collier</span></article></aside>
    </section>
  </div>;
}

function Calendar({ events, openAdd, editEvent, monthOffset, setMonthOffset, view, setView, selectedDate, setSelectedDate, locale }: {
  events: EventItem[]; openAdd: (date?: string) => void; editEvent: (event: EventItem) => void; monthOffset: number; setMonthOffset: (value: number) => void; view: string; setView: (value: string) => void; selectedDate: string; setSelectedDate: (date: string) => void; locale: string;
}) {
  const month = new Date(new Date().getFullYear(), new Date().getMonth() + monthOffset, 1);
  const monthTitle = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(month);
  const changeMonth = (value: number) => {
    const next = new Date(new Date().getFullYear(), new Date().getMonth() + value, 1);
    setMonthOffset(value);
    setSelectedDate(localDate(next));
  };
  return <div className="page">
    <div className="page-heading calendar-title"><div><p className="eyebrow">PLAN YOUR TIME</p><h1>Calendar</h1><p>Stay on top of events, deadlines, and everything in between.</p></div><Button icon="plus" onClick={() => openAdd(selectedDate)}>Add event</Button></div>
    <div className="calendar-toolbar card"><div className="month-controls"><Button variant="secondary" onClick={() => changeMonth(0)}>Today</Button><button aria-label="Previous month" onClick={() => changeMonth(monthOffset - 1)}><Icon name="chevronLeft"/></button><button aria-label="Next month" onClick={() => changeMonth(monthOffset + 1)}><Icon name="chevronRight"/></button><h2>{monthTitle}</h2></div><div className="view-tabs">{["Month", "Week", "Day", "Agenda"].map(item => <button className={view === item ? "active" : ""} onClick={() => setView(item)} key={item}>{item}</button>)}</div></div>
    {view === "Month" ? <MonthGrid month={month} events={events} selectedDate={selectedDate} setSelectedDate={setSelectedDate} editEvent={editEvent} openAdd={openAdd}/> : <AgendaView events={events} view={view} month={month} selectedDate={selectedDate} setSelectedDate={setSelectedDate} editEvent={editEvent} openAdd={openAdd} locale={locale}/>}
  </div>;
}

function MonthGrid({ month, events, selectedDate, setSelectedDate, editEvent, openAdd }: {
  month: Date; events: EventItem[]; selectedDate: string; setSelectedDate: (date: string) => void; editEvent: (event: EventItem) => void; openAdd: (date: string) => void;
}) {
  const firstWeekday = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const count = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const dates = Array.from({ length: count }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index - firstWeekday + 1));
  const monthNumber = month.getMonth();
  const selectedEvents = events.filter(event => event.date === selectedDate).sort((a, b) => a.start.localeCompare(b.start));
  return <div className="calendar-month-view"><div className="calendar-shell card"><div className="weekdays">{["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(day => <div key={day}>{day}</div>)}</div>
    <div className="month-grid">{dates.map(date => {
      const dateKey = localDate(date);
      const dayEvents = events.filter(event => event.date === dateKey).sort((a, b) => a.start.localeCompare(b.start));
      const isToday = dateKey === localDate(new Date());
      return <div className={`calendar-cell ${date.getMonth() !== monthNumber ? "muted" : ""} ${isToday ? "today" : ""} ${selectedDate === dateKey ? "selected" : ""}`} key={dateKey} onClick={() => setSelectedDate(dateKey)}>
        <button className="day-number" onClick={event => { event.stopPropagation(); setSelectedDate(dateKey); }}>{date.getDate()}{isToday && <span>Today</span>}</button>
        {dayEvents.slice(0, 3).map(event => <button title={`Edit ${event.title}`} aria-label={`${event.start} ${event.title}. Edit event`} onClick={click => { click.stopPropagation(); editEvent(event); }} className={`calendar-event event-${categories[event.category] ?? "blue"}`} key={event.id}><i/>{event.start} <b>{event.title}</b></button>)}
        {dayEvents.length > 3 && <button className="calendar-more" onClick={event => { event.stopPropagation(); setSelectedDate(dateKey); }}>+{dayEvents.length - 3} more</button>}
        {selectedDate === dateKey && <button className="add-calendar-event" onClick={event => { event.stopPropagation(); openAdd(dateKey); }} aria-label={`Add event on ${dateKey}`}><Icon name="plus" size={13}/></button>}
      </div>;
    })}</div>
  </div><section className="mobile-day-agenda card"><div className="mobile-agenda-heading"><div><h2>{formatDate(selectedDate, { weekday: "long", month: "long", day: "numeric" })}</h2><p>{selectedEvents.length} events</p></div><button onClick={() => openAdd(selectedDate)} aria-label="Add event"><Icon name="plus"/></button></div>
    {selectedEvents.length ? selectedEvents.map(event => <button className="mobile-agenda-event" key={event.id} onClick={() => editEvent(event)}><span className={`mobile-agenda-dot ${categories[event.category] ?? "blue"}`}/><span><b>{event.title}</b><small>{formatTime(event.start)}{event.end ? ` – ${formatTime(event.end)}` : ""} · {event.category}</small></span><Icon name="chevronRight" size={17}/></button>) : <p className="mobile-agenda-empty">Nothing scheduled for this day.</p>}
  </section></div>;
}

function AgendaView({ events, view, month, selectedDate, setSelectedDate, editEvent, openAdd, locale }: {
  events: EventItem[]; view: string; month: Date; selectedDate: string; setSelectedDate: (date: string) => void; editEvent: (event: EventItem) => void; openAdd: (date: string) => void; locale: string;
}) {
  const selection = new Date(`${selectedDate}T00:00:00`);
  const weekStart = new Date(selection);
  weekStart.setDate(selection.getDate() - ((selection.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const visible = events.filter(event => {
    if (view === "Day") return event.date === selectedDate;
    if (view === "Week") return event.date >= localDate(weekStart) && event.date <= localDate(weekEnd);
    return event.date.startsWith(`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`);
  }).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  const heading = view === "Day" ? formatDate(selectedDate, { weekday: "long", month: "long", day: "numeric" }, locale) : view === "Week" ? `${formatDate(localDate(weekStart), { month: "short", day: "numeric" }, locale)} – ${formatDate(localDate(weekEnd), { month: "short", day: "numeric" }, locale)}` : `${month.toLocaleDateString(locale, { month: "long" })} agenda`;
  return <div className="card agenda"><div className="agenda-header"><div><h2>{heading}</h2><p>{visible.length} scheduled events</p></div><div className="agenda-actions">{view !== "Agenda" && <input className="date-picker-inline" aria-label="Selected date" type="date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)}/>}<Button variant="secondary" icon="plus" onClick={() => openAdd(selectedDate)}>Add event</Button></div></div>
    {visible.length ? visible.map(event => <button className="agenda-item agenda-item-button" key={event.id} onClick={() => editEvent(event)}><div className={`agenda-date ${categories[event.category] ?? "blue"}`}><b>{new Date(`${event.date}T00:00:00`).getDate()}</b><span>{formatDate(event.date, { month: "short" }, locale).toUpperCase()}</span></div><div><b>{event.title}</b><span><Icon name="clock" size={14}/>{formatDate(event.date, { weekday: "short", month: "short", day: "numeric" }, locale)} · {formatTime(event.start, locale)}{event.end ? ` – ${formatTime(event.end, locale)}` : ""}{event.location ? ` · ${event.location}` : ""}</span></div><Badge color={categories[event.category] ?? "gray"}>{event.category}</Badge></button>) : <div className="empty-state"><Icon name="calendar" size={34}/><b>No events scheduled</b><span>Choose another date or add an event.</span><Button variant="secondary" onClick={() => openAdd(selectedDate)}>Add event</Button></div>}
  </div>;
}

function Tasks({ tasks, quickTask, setQuickTask, addTask, toggleTask, filter, setFilter, openAdd, editTask, deleteTask, locale }: {
  tasks: Task[]; quickTask: string; setQuickTask: (value: string) => void; addTask: () => void; toggleTask: (id: string) => void; filter: string; setFilter: (value: string) => void; openAdd: () => void; editTask: (task: Task) => void; deleteTask: (id: string) => void; locale: string;
}) {
  const today = localDate(new Date());
  const tomorrow = offsetDate(1);
  const shown = tasks.filter(task => filter === "All" || (filter === "Completed" ? task.done : !task.done && task.dueDate === (filter === "Tomorrow" ? tomorrow : today))).sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.dueTime.localeCompare(b.dueTime));
  const filters = ["All", "Today", "Tomorrow", "Completed"];
  const countFor = (item: string) => item === "All" ? tasks.length : item === "Completed" ? tasks.filter(task => task.done).length : tasks.filter(task => !task.done && task.dueDate === (item === "Tomorrow" ? tomorrow : today)).length;
  return <div className="page narrow-page"><div className="page-heading"><div><p className="eyebrow">MAKE IT HAPPEN</p><h1>My Tasks</h1><p>Capture what matters and keep moving forward.</p></div><Button icon="plus" onClick={openAdd}>New task</Button></div>
    <form className="quick-add card" onSubmit={event => { event.preventDefault(); addTask(); }}><div className="task-checkbox empty"><Icon name="plus" size={16}/></div><input value={quickTask} onChange={event => setQuickTask(event.target.value)} placeholder="Add a task and press Enter..." aria-label="New task title"/><Button type="submit">Add task</Button></form>
    <div className="filter-tabs">{filters.map(item => <button className={filter === item ? "active" : ""} onClick={() => setFilter(item)} key={item}>{item}<span>{countFor(item)}</span></button>)}</div>
    <div className="task-list card">{shown.length ? shown.map(task => <div className={task.done ? "task-row done" : "task-row"} key={task.id}>
      <button className={task.done ? "task-checkbox checked" : "task-checkbox"} aria-label={task.done ? "Mark as incomplete" : "Complete task"} onClick={() => toggleTask(task.id)}>{task.done && <Icon name="check" size={15}/>}</button>
      <button className="task-main task-main-button" onClick={() => editTask(task)}><b>{task.title}</b><span><Icon name="clock" size={14}/>{formatDate(task.dueDate, { month: "short", day: "numeric" }, locale)}{task.dueTime ? ` · ${formatTime(task.dueTime, locale)}` : ""}</span></button>
      <Badge color={categories[task.category] ?? "gray"}>{task.category}</Badge><Badge color={task.priority === "High" ? "red" : task.priority === "Medium" ? "amber" : "gray"}>{task.priority}</Badge>
      <button className="row-action" onClick={() => editTask(task)} aria-label="Edit task"><Icon name="note" size={17}/></button><button className="row-action danger" onClick={() => deleteTask(task.id)} aria-label="Delete task"><Icon name="trash" size={17}/></button>
    </div>) : <div className="empty-state"><Icon name="check" size={34}/><b>All clear</b><span>No tasks in this view.</span></div>}</div>
  </div>;
}

function MyDay({ data, today, toggleTask, setDayNote, openEvent, locale }: { data: PlannerData; today: string; toggleTask: (id: string) => void; setDayNote: (value: string) => void; openEvent: (event?: EventItem) => void; locale: string }) {
  const tasks = data.tasks.filter(task => task.dueDate === today);
  const events = data.events.filter(event => event.date === today).sort((a, b) => a.start.localeCompare(b.start));
  const completed = tasks.filter(task => task.done).length;
  const progress = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">MY DAY</p><h1>{formatDate(today, { weekday: "long", month: "long", day: "numeric" }, locale)}</h1><p>A calm view of everything that matters today.</p></div><Button icon="plus" onClick={() => openEvent()}>Add event</Button></div>
    <div className="myday-grid">
      <article className="card myday-schedule"><div className="section-heading"><div><h2>Today's schedule</h2><p>{events.length} events</p></div><button className="row-action" onClick={() => openEvent()} aria-label="Add event"><Icon name="plus"/></button></div>
        {events.length ? events.map(event => <button className="day-event day-event-button" key={event.id} onClick={() => openEvent(event)}><time>{formatTime(event.start, locale)}</time><i className={categories[event.category] ?? "blue"}/><div><b>{event.title}</b><span>{event.end ? `${formatTime(event.start, locale)} – ${formatTime(event.end, locale)}` : event.category}</span></div></button>) : <div className="empty-state"><span>No events planned for today.</span><Button variant="secondary" onClick={() => openEvent()}>Add an event</Button></div>}
      </article>
      <article className="card priorities"><div className="section-heading"><div><h2>Top priorities</h2><p>Your open tasks for today</p></div><Badge color="amber">{tasks.filter(task => !task.done).length}</Badge></div>{tasks.filter(task => !task.done).slice(0, 3).map((task, index) => <button className="priority-row" key={task.id} onClick={() => toggleTask(task.id)}><span>{index + 1}</span><div><b>{task.title}</b><small>{task.category}</small></div><Icon name="check" size={18}/></button>)}</article>
      <article className="card day-tasks"><div className="section-heading"><div><h2>To-do list</h2><p>{completed} completed</p></div></div>{tasks.length ? tasks.map(task => <div className={task.done ? "mini-task done" : "mini-task"} key={task.id}><button className={task.done ? "task-checkbox checked" : "task-checkbox"} onClick={() => toggleTask(task.id)} aria-label="Toggle task">{task.done && <Icon name="check" size={14}/>}</button><span>{task.title}</span><Badge color={categories[task.category] ?? "gray"}>{task.category}</Badge></div>) : <div className="empty-state"><span>No tasks for today.</span></div>}</article>
      <article className="card day-note"><div className="section-heading"><div><h2>Notes</h2><p>Thoughts for today · autosaved</p></div></div><textarea value={data.dayNote} onChange={event => setDayNote(event.target.value)} aria-label="Notes for today"/></article>
      <article className="card daily-progress"><div><span className="label">DAILY PROGRESS</span><h2>{progress === 100 && tasks.length ? "Everything is complete!" : "One step at a time."}</h2><p>{completed} of {tasks.length} tasks completed today.</p></div><div className="progress-ring"><svg viewBox="0 0 42 42"><circle cx="21" cy="21" r="16"/><circle className="value" cx="21" cy="21" r="16" style={{ strokeDasharray: `${progress} 100` }}/></svg><b>{progress}%</b></div></article>
    </div>
  </div>;
}

function Notes({ notes, query, setQuery, openAdd, editNote, deleteNote, locale }: { notes: Note[]; query: string; setQuery: (value: string) => void; openAdd: () => void; editNote: (note: Note) => void; deleteNote: (id: string) => void; locale: string }) {
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sort, setSort] = useState("Newest first");
  const visible = notes.filter(note => `${note.title} ${note.content} ${note.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase()) && (categoryFilter === "All" || note.category === categoryFilter));
  visible.sort((a, b) => sort === "Oldest first" ? a.updatedAt.localeCompare(b.updatedAt) : sort === "Title A–Z" ? a.title.localeCompare(b.title) : b.updatedAt.localeCompare(a.updatedAt));
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">YOUR SECOND BRAIN</p><h1>Notes</h1><p>Ideas, reflections, and details — all in one place.</p></div><Button icon="plus" onClick={openAdd}>New note</Button></div>
    <div className="notes-toolbar"><div className="search-field"><Icon name="search" size={18}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search notes..."/></div><select aria-label="Filter notes by category" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option>All</option>{categoryNames.map(category => <option key={category}>{category}</option>)}</select><select aria-label="Sort notes" value={sort} onChange={event => setSort(event.target.value)}><option>Newest first</option><option>Oldest first</option><option>Title A–Z</option></select></div>
    <div className="notes-grid">{visible.map((note, index) => <article className={`note-card card note-${index % 3}`} key={note.id}><div className="note-card-top"><Badge color={categories[note.category] ?? "gray"}>{note.category}</Badge><div className="note-actions"><button onClick={() => editNote(note)} aria-label="Edit note"><Icon name="note"/></button><button onClick={() => deleteNote(note.id)} aria-label="Delete note"><Icon name="trash"/></button></div></div><button className="note-open" onClick={() => editNote(note)}><h2>{note.title}</h2><p>{note.content || "No content yet."}</p></button><div className="tags">{note.tags.map(tag => <span key={tag}>#{tag}</span>)}</div><footer><span>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(note.updatedAt))}</span><button onClick={() => editNote(note)} aria-label="Open note"><Icon name="arrow" size={17}/></button></footer></article>)}
      {visible.length === 0 && <div className="empty-state card"><Icon name="note" size={34}/><b>No notes found</b><span>Try another search or create a new note.</span></div>}
      <button className="new-note-card" onClick={openAdd}><span><Icon name="plus"/></span><b>Create a new note</b><small>Capture an idea before it slips away</small></button>
    </div>
  </div>;
}

function Goals({ goals, setGoals, openAdd, editGoal, locale }: { goals: Goal[]; setGoals: (goals: Goal[]) => void; openAdd: () => void; editGoal: (goal: Goal) => void; locale: string }) {
  const average = goals.length ? Math.round(goals.reduce((sum, goal) => sum + Math.min(100, goal.current / Math.max(goal.target, 1) * 100), 0) / goals.length) : 0;
  const changeProgress = (goal: Goal, amount: number) => setGoals(goals.map(item => item.id === goal.id ? { ...item, current: Math.max(0, Math.min(item.target, item.current + amount)) } : item));
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">KEEP GROWING</p><h1>Goals</h1><p>Turn your intentions into steady, visible progress.</p></div><Button icon="plus" onClick={openAdd}>New goal</Button></div>
    <div className="goal-hero card"><div><span className="label">{new Date().getFullYear()} OVERVIEW</span><h2>{goals.length ? "You're making meaningful progress" : "Start with a goal that matters"}</h2><p>{goals.length} active {goals.length === 1 ? "goal" : "goals"} · {goals.filter(goal => goal.current >= goal.target).length} completed</p></div><div className="goal-stat"><b>{average}%</b><span>average progress</span></div></div>
    {goals.length ? <div className="goals-grid">{goals.map(goal => {
      const value = Math.min(100, Math.round(goal.current / Math.max(goal.target, 1) * 100));
      const color = categories[goal.category] ?? "blue";
      const milestone = goal.unit === "dollars" ? `$${goal.current.toLocaleString()} of $${goal.target.toLocaleString()}` : `${goal.current} of ${goal.target} ${goal.unit}`;
      return <article className="card goal-card" key={goal.id}><div className="goal-top"><button className={`icon-tile ${color}`} onClick={() => editGoal(goal)} aria-label="Edit goal"><Icon name="target"/></button><button className="row-action" onClick={() => editGoal(goal)} aria-label="Edit goal"><Icon name="more"/></button></div><Badge color={color}>{goal.category}</Badge><h2>{goal.name}</h2><p>{goal.description}</p><div className="goal-progress"><div><span>Progress</span><b>{value}%</b></div><Progress value={value} color={color}/></div><footer><span><Icon name="calendar" size={15}/>{formatDate(goal.dueDate, { month: "long", day: "numeric", year: "numeric" }, locale)}</span><b>{milestone}</b></footer><div className="goal-controls"><button onClick={() => changeProgress(goal, -1)} aria-label="Decrease progress">−</button><span>Update progress</span><button onClick={() => changeProgress(goal, 1)} aria-label="Increase progress">+</button><button onClick={() => editGoal(goal)} aria-label="Edit goal details"><Icon name="note" size={16}/></button></div></article>;
    })}</div> : <div className="empty-state card"><Icon name="target" size={34}/><b>No goals yet</b><span>Choose a goal and track your progress.</span><Button onClick={openAdd}>Create a goal</Button></div>}
  </div>;
}

function Avatar({ name, photo, className = "" }: { name: string; photo?: string; className?: string }) {
  const initials = name.split(" ").map(part => part[0]).slice(0, 2).join("").toUpperCase();
  return <div className={`avatar ${className}`} aria-hidden="true">{photo ? <img src={photo} alt=""/> : initials}</div>;
}

function Settings({ settings, onSave, onExport, onReset }: {
  settings: PlannerData["settings"]; onSave: (settings: PlannerData["settings"]) => void; onExport: () => void; onReset: () => void;
}) {
  const [draft, setDraft] = useState(settings);
  const [avatarError, setAvatarError] = useState("");
  const avatarInput = useRef<HTMLInputElement>(null);
  useEffect(() => setDraft(settings), [settings]);
  return <div className="page narrow-page"><div className="page-heading"><div><p className="eyebrow">PERSONALIZE</p><h1>Settings</h1><p>Shape Personal Planner around the way you work.</p></div></div>
    <div className="settings-layout"><div className="settings-menu card">{["General", "Appearance", "Data & privacy"].map((label, index) => <a className={index === 0 ? "active" : ""} href={`#${label.toLowerCase().replace(/\s+/g, "-")}`} key={label}><Icon name={index === 1 ? "sun" : index === 2 ? "note" : "settings"}/>{label}</a>)}</div>
      <div className="settings-content">
        <section id="general" className="card setting-section"><div><h2>General</h2><p>Basic preferences for your workspace.</p></div><label>Full name<input value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))}/></label><div className="profile-photo-controls"><Avatar name={draft.name} photo={draft.avatar} className="profile-avatar"/><div><div className="profile-photo-actions"><Button variant="secondary" icon="plus" onClick={() => avatarInput.current?.click()}>{draft.avatar ? "Change photo" : "Upload photo"}</Button>{draft.avatar && <Button variant="ghost" onClick={() => { setDraft(current => ({ ...current, avatar: "" })); setAvatarError(""); }}>Remove</Button>}</div><span>JPG, PNG, or WebP. Images are resized automatically.</span>{avatarError && <span className="profile-photo-error" role="alert">{avatarError}</span>}<input ref={avatarInput} type="file" accept="image/*" aria-label="Choose profile photo" onChange={async event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (!file) return; try { const avatar = await resizeProfileImage(file); setDraft(current => ({ ...current, avatar })); setAvatarError(""); } catch (error) { setAvatarError(error instanceof Error ? error.message : "Could not process this image."); } }}/></div></div></section>
        <section id="appearance" className="card setting-section"><div><h2>Appearance</h2><p>Choose how Personal Planner looks to you.</p></div><div className="theme-choices"><button className={!draft.dark ? "active" : ""} onClick={() => setDraft(current => ({ ...current, dark: false }))}><div className="theme-preview light-preview"/><b>Light</b></button><button className={draft.dark ? "active" : ""} onClick={() => setDraft(current => ({ ...current, dark: true }))}><div className="theme-preview dark-preview"/><b>Dark</b></button></div><label>Accent color<div className="color-options">{Object.keys(accentColors).map(color => <button type="button" className={draft.accent === color ? "selected" : ""} aria-label={color} key={color} style={{ background: accentColors[color] }} onClick={() => setDraft(current => ({ ...current, accent: color }))}/>)}</div></label></section>
        <section id="data-privacy" className="card setting-section"><div><h2>Data & privacy</h2><p>Your planner is stored locally in this browser.</p></div><div className="settings-data-actions"><Button variant="secondary" icon="download" onClick={onExport}>Export backup</Button><Button variant="danger" icon="trash" onClick={onReset}>Reset planner</Button></div></section>
        <div className="save-settings"><Button variant="secondary" onClick={() => setDraft(settings)}>Cancel</Button><Button onClick={() => onSave({ ...draft, name: draft.name.trim() || "Planner user" })}>Save changes</Button></div>
      </div>
    </div>
  </div>;
}

function Modal({ children, close, title, subtitle }: { children: ReactNode; close: () => void; title: string; subtitle: string }) {
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><div><h2 id="modal-title">{title}</h2><p>{subtitle}</p></div><button type="button" onClick={close} aria-label="Close dialog"><Icon name="close"/></button></div>{children}</section></div>;
}

function EventModal({ event, initialDate, close, save, onDelete }: { event: EventItem | null; initialDate: string; close: () => void; save: (event: EventItem) => void; onDelete: (id: string) => void }) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [date, setDate] = useState(event?.date ?? initialDate);
  const [start, setStart] = useState(event?.start ?? "09:00");
  const [end, setEnd] = useState(event?.end ?? "10:00");
  const [category, setCategory] = useState(event?.category ?? "Work");
  const [location, setLocation] = useState(event?.location ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  return <Modal close={close} title={event ? "Edit event" : "Create new event"} subtitle="Add something important to your calendar."><form onSubmit={submit => { submit.preventDefault(); save({ id: event?.id ?? createId(), title: title.trim(), date, start, end, category, location: location.trim(), description: description.trim() }); }}>
    <label>Event title<input autoFocus required value={title} onChange={input => setTitle(input.target.value)} placeholder="What are you planning?"/></label>
    <div className="field-row"><label>Date<input required type="date" value={date} onChange={input => setDate(input.target.value)}/></label><label>Category<select value={category} onChange={input => setCategory(input.target.value)}>{categoryNames.map(item => <option key={item}>{item}</option>)}</select></label></div>
    <div className="field-row"><label>Start time<input required type="time" value={start} onChange={input => setStart(input.target.value)}/></label><label>End time<input type="time" min={start} value={end} onChange={input => setEnd(input.target.value)}/></label></div>
    <label>Location<div className="input-with-icon"><Icon name="pin" size={17}/><input value={location} onChange={input => setLocation(input.target.value)} placeholder="Add a location"/></div></label><label>Description<textarea value={description} onChange={input => setDescription(input.target.value)} placeholder="Add notes or helpful details..."/></label>
    <div className="modal-actions">{event && <Button variant="danger" icon="trash" onClick={() => onDelete(event.id)}>Delete</Button>}<Button variant="secondary" onClick={close}>Cancel</Button><Button type="submit">{event ? "Save changes" : "Save event"}</Button></div>
  </form></Modal>;
}

function NoteModal({ note, close, save, onDelete }: { note: Note | null; close: () => void; save: (note: Note) => void; onDelete: (id: string) => void }) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [category, setCategory] = useState(note?.category ?? "Personal");
  const [tags, setTags] = useState(note?.tags.join(", ") ?? "");
  return <Modal close={close} title={note ? "Edit note" : "New note"} subtitle="Capture a thought, idea, or important detail."><form onSubmit={submit => { submit.preventDefault(); save({ id: note?.id ?? createId(), title: title.trim(), content: content.trim(), category, updatedAt: new Date().toISOString(), tags: [...new Set(tags.split(",").map(tag => tag.trim().replace(/^#/, "")).filter(Boolean))] }); }}>
    <label>Title<input autoFocus required value={title} onChange={input => setTitle(input.target.value)} placeholder="Give your note a title"/></label><label>Content<textarea className="tall" value={content} onChange={input => setContent(input.target.value)} placeholder="Start writing..."/></label><div className="field-row"><label>Category<select value={category} onChange={input => setCategory(input.target.value)}>{categoryNames.map(item => <option key={item}>{item}</option>)}</select></label><label>Tags<input value={tags} onChange={input => setTags(input.target.value)} placeholder="ideas, personal"/></label></div>
    <div className="modal-actions">{note && <Button variant="danger" icon="trash" onClick={() => onDelete(note.id)}>Delete</Button>}<Button variant="secondary" onClick={close}>Cancel</Button><Button type="submit">{note ? "Save changes" : "Create note"}</Button></div>
  </form></Modal>;
}

function TaskModal({ task, close, save, onDelete }: { task: Task | null; close: () => void; save: (task: Task) => void; onDelete: (id: string) => void }) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? localDate(new Date()));
  const [dueTime, setDueTime] = useState(task?.dueTime ?? "");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "Medium");
  const [category, setCategory] = useState(task?.category ?? "Personal");
  return <Modal close={close} title={task ? "Edit task" : "New task"} subtitle="Keep your next action clear and manageable."><form onSubmit={submit => { submit.preventDefault(); save({ id: task?.id ?? createId(), title: title.trim(), dueDate, dueTime, priority, category, done: task?.done ?? false }); }}>
    <label>Task title<input autoFocus required value={title} onChange={input => setTitle(input.target.value)} placeholder="What needs to get done?"/></label><div className="field-row"><label>Due date<input required type="date" value={dueDate} onChange={input => setDueDate(input.target.value)}/></label><label>Time<input type="time" value={dueTime} onChange={input => setDueTime(input.target.value)}/></label></div><div className="field-row"><label>Category<select value={category} onChange={input => setCategory(input.target.value)}>{categoryNames.map(item => <option key={item}>{item}</option>)}</select></label><label>Priority<select value={priority} onChange={input => setPriority(input.target.value as Priority)}><option>Low</option><option>Medium</option><option>High</option></select></label></div>
    <div className="modal-actions">{task && <Button variant="danger" icon="trash" onClick={() => onDelete(task.id)}>Delete</Button>}<Button variant="secondary" onClick={close}>Cancel</Button><Button type="submit">{task ? "Save changes" : "Create task"}</Button></div>
  </form></Modal>;
}

function GoalModal({ goal, close, save, onDelete }: { goal: Goal | null; close: () => void; save: (goal: Goal) => void; onDelete: (id: string) => void }) {
  const [name, setName] = useState(goal?.name ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [dueDate, setDueDate] = useState(goal?.dueDate ?? offsetDate(30));
  const [current, setCurrent] = useState(String(goal?.current ?? 0));
  const [target, setTarget] = useState(String(goal?.target ?? 10));
  const [unit, setUnit] = useState(goal?.unit ?? "steps");
  const [category, setCategory] = useState(goal?.category ?? "Personal");
  return <Modal close={close} title={goal ? "Edit goal" : "New goal"} subtitle="Define a goal and track your progress."><form onSubmit={submit => { submit.preventDefault(); save({ id: goal?.id ?? createId(), name: name.trim(), description: description.trim(), dueDate, current: Number(current), target: Number(target), unit: unit.trim() || "steps", category }); }}>
    <label>Goal name<input autoFocus required value={name} onChange={input => setName(input.target.value)} placeholder="What do you want to achieve?"/></label><label>Description<textarea value={description} onChange={input => setDescription(input.target.value)} placeholder="Why does this goal matter?"/></label><div className="field-row"><label>Due date<input type="date" required value={dueDate} onChange={input => setDueDate(input.target.value)}/></label><label>Category<select value={category} onChange={input => setCategory(input.target.value)}>{categoryNames.map(item => <option key={item}>{item}</option>)}</select></label></div><div className="field-row"><label>Current progress<input required type="number" min="0" max={target || undefined} value={current} onChange={input => setCurrent(input.target.value)}/></label><label>Target<input required type="number" min="1" value={target} onChange={input => { setTarget(input.target.value); setCurrent(progress => progress && Number(progress) > Number(input.target.value) ? input.target.value : progress); }}/></label></div><label>Progress unit<input value={unit} onChange={input => setUnit(input.target.value)} placeholder="books, runs, dollars..."/></label>
    <div className="modal-actions">{goal && <Button variant="danger" icon="trash" onClick={() => onDelete(goal.id)}>Delete</Button>}<Button variant="secondary" onClick={close}>Cancel</Button><Button type="submit">{goal ? "Save changes" : "Create goal"}</Button></div>
  </form></Modal>;
}

function SearchModal({ query, setQuery, tasks, events, notes, goals, close, navigate }: {
  query: string; setQuery: (value: string) => void; tasks: Task[]; events: EventItem[]; notes: Note[]; goals: Goal[]; close: () => void; navigate: (page: Page) => void;
}) {
  const search = query.trim().toLowerCase();
  const groups = [
    { title: "Tasks", page: "Tasks" as Page, icon: "check", items: tasks.filter(task => task.title.toLowerCase().includes(search)).map(task => ({ id: task.id, title: task.title, detail: task.category })) },
    { title: "Events", page: "Calendar" as Page, icon: "calendar", items: events.filter(event => event.title.toLowerCase().includes(search)).map(event => ({ id: event.id, title: event.title, detail: `${event.date} · ${event.category}` })) },
    { title: "Notes", page: "Notes" as Page, icon: "note", items: notes.filter(note => `${note.title} ${note.content} ${note.tags.join(" ")}`.toLowerCase().includes(search)).map(note => ({ id: note.id, title: note.title, detail: note.category })) },
    { title: "Goals", page: "Goals" as Page, icon: "target", items: goals.filter(goal => `${goal.name} ${goal.description}`.toLowerCase().includes(search)).map(goal => ({ id: goal.id, title: goal.name, detail: goal.category })) },
  ];
  return <div className="modal-backdrop search-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><section className="search-modal" role="dialog" aria-modal="true" aria-label="Search planner"><div className="search-input"><Icon name="search"/><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search events, tasks, notes, and goals..."/><kbd>ESC</kbd></div>{search ? <div className="search-results">{groups.map(group => group.items.length > 0 && <div className="result-group" key={group.title}><span>{group.title}</span>{group.items.slice(0, 5).map(item => <button key={item.id} onClick={() => navigate(group.page)}><div className="icon-tile blue"><Icon name={group.icon} size={16}/></div><div><b>{item.title}</b><small>{item.detail}</small></div><Icon name="arrow" size={16}/></button>)}</div>)}{groups.every(group => group.items.length === 0) && <div className="empty-state"><b>No results</b><span>Try another search.</span></div>}</div> : <div className="search-empty"><Icon name="search" size={30}/><b>Search your planner</b><span>Try “meeting”, “work”, or “reading”.</span></div>}</section></div>;
}

function NotificationPanel({ notices, close }: { notices: Notice[]; close: () => void }) {
  return <div className="notification-panel card"><div className="panel-head"><div><h2>Notifications</h2><p>{notices.length ? `${notices.length} updates for today` : "You're all caught up"}</p></div><button onClick={close} aria-label="Close notifications"><Icon name="close" size={18}/></button></div>
    {notices.length ? notices.map(notice => <div className="notification-item" key={`${notice.icon}-${notice.title}`}><div className={`icon-tile ${notice.color}`}><Icon name={notice.icon} size={17}/></div><div><b>{notice.title}</b><span>{notice.detail}</span></div><i/></div>) : <div className="notification-empty"><Icon name="bell"/><span>No events or tasks due today.</span></div>}
    <Button variant="ghost" onClick={close}>Done</Button>
  </div>;
}

function exportData(data: PlannerData) {
  const file = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `personal-planner-backup-${localDate(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export default App;
