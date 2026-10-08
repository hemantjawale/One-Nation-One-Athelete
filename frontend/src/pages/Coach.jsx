import React, { useState, useEffect } from "react";
import { useOutletContext, useLocation, useNavigate } from "react-router-dom";
import {
  Users,
  Calendar,
  Activity,
  HeartPulse,
  Target,
  Compass,
  Bell,
  User,
  LayoutDashboard,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Plus,
} from "lucide-react";
import { PageTitle, Modal } from "../components/UI";
import {
  getCoachDashboard,
  getCoachAthletes,
  getCoachAthleteDetail,
  getCoachTrainingPlans,
  createCoachTrainingPlan,
  updateCoachTrainingPlan,
  publishCoachTrainingPlan,
  rescheduleCoachSession,
  updateCoachAthleteGoals,
  getCoachNotifications,
  getCoachProfile,
  updateCoachProfile,
} from "../lib/api";

import { CoachDashboardView } from "../components/coach/CoachDashboardView";
import { CoachAthletesView } from "../components/coach/CoachAthletesView";
import { CoachAthleteDetailView } from "../components/coach/CoachAthleteDetailView";
import { CoachPlanBuilderView } from "../components/coach/CoachPlanBuilderView";
import { CoachTrainingPlansView } from "../components/coach/CoachTrainingPlansView";
import {
  CoachPerformanceHubView,
  CoachRecoveryHubView,
  CoachGoalsHubView,
  CoachRoadmapsHubView,
} from "../components/coach/CoachPortfolioHubs";
import { CoachNotificationsView } from "../components/coach/CoachNotificationsView";
import { CoachProfileView } from "../components/coach/CoachProfileView";

export default function Coach() {
  const { user, notify } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();

  // Primary data states
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [plans, setPlans] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [coachProfile, setCoachProfile] = useState(null);

  // Athletes search/filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sportFilter, setSportFilter] = useState("all");

  // Selected athlete detail state
  const [selectedAthleteId, setSelectedAthleteId] = useState(null);
  const [athleteDetail, setAthleteDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Subpath parsing
  const pathname = location.pathname;
  let activeTab = "dashboard";
  let urlAthleteId = null;

  if (pathname.includes("/coach/athletes/") && !pathname.endsWith("/athletes/")) {
    const parts = pathname.split("/coach/athletes/");
    if (parts[1]) {
      activeTab = "athlete-detail";
      urlAthleteId = parts[1].split("/")[0].split("?")[0];
    }
  } else if (pathname.endsWith("/coach/athletes")) {
    activeTab = "athletes";
  } else if (pathname.endsWith("/coach/plans") || pathname.endsWith("/coach/training-plans")) {
    activeTab = "plans";
  } else if (pathname.endsWith("/coach/builder") || pathname.endsWith("/coach/plans/new")) {
    activeTab = "builder";
  } else if (pathname.endsWith("/coach/performance")) {
    activeTab = "performance";
  } else if (pathname.endsWith("/coach/recovery")) {
    activeTab = "recovery";
  } else if (pathname.endsWith("/coach/goals")) {
    activeTab = "goals";
  } else if (pathname.endsWith("/coach/roadmaps")) {
    activeTab = "roadmaps";
  } else if (pathname.endsWith("/coach/notifications")) {
    activeTab = "notifications";
  } else if (pathname.endsWith("/coach/profile")) {
    activeTab = "profile";
  }

  // Load core dashboard & roster
  async function loadInitialData() {
    try {
      setLoading(true);
      const [dashRes, athRes, planRes, notifRes, profRes] = await Promise.all([
        getCoachDashboard().catch(() => null),
        getCoachAthletes().catch(() => []),
        getCoachTrainingPlans().catch(() => []),
        getCoachNotifications().catch(() => []),
        getCoachProfile().catch(() => null),
      ]);

      setDashboardData(dashRes);
      setAthletes(Array.isArray(athRes) ? athRes : athRes?.athletes || []);
      setPlans(Array.isArray(planRes) ? planRes : planRes?.plans || []);
      setNotifications(Array.isArray(notifRes) ? notifRes : notifRes?.notifications || []);
      setCoachProfile(profRes?.profile || profRes || null);
    } catch (err) {
      console.error("Failed to load coach workspace data", err);
      notify?.("Failed to load coach hub: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  // Filtered athlete loader
  async function loadFilteredAthletes() {
    try {
      const res = await getCoachAthletes({
        search: searchQuery,
        status: statusFilter !== "all" ? statusFilter : undefined,
        sport: sportFilter !== "all" ? sportFilter : undefined,
      });
      setAthletes(Array.isArray(res) ? res : res?.athletes || []);
    } catch (err) {
      console.error("Failed to filter athletes", err);
    }
  }

  // Athlete detail loader
  async function loadAthleteDetailData(id) {
    if (!id) return;
    try {
      setLoadingDetail(true);
      const res = await getCoachAthleteDetail(id);
      setAthleteDetail(res);
      setSelectedAthleteId(id);
    } catch (err) {
      console.error("Failed to load athlete detail", err);
      notify?.("Error loading athlete dossier: " + err.message, "error");
    } finally {
      setLoadingDetail(false);
    }
  }

  useEffect(() => {
    if (["coach", "medical"].includes(user?.role) || user?.demo) {
      loadInitialData();
    }
  }, [user]);

  useEffect(() => {
    if (urlAthleteId && urlAthleteId !== selectedAthleteId) {
      setSelectedAthleteId(urlAthleteId);
      loadAthleteDetailData(urlAthleteId);
    }
  }, [urlAthleteId]);

  useEffect(() => {
    if (!loading && (searchQuery || statusFilter !== "all" || sportFilter !== "all")) {
      const timer = setTimeout(() => {
        loadFilteredAthletes();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, statusFilter, sportFilter]);

  // Handlers
  function handleSelectAthlete(athleteId, detailTab = "overview") {
    setSelectedAthleteId(athleteId);
    loadAthleteDetailData(athleteId);
    navigate(`/app/coach/athletes/${athleteId}`);
  }

  function handleStartPlanBuilder(athleteId = null) {
    if (athleteId) {
      setSelectedAthleteId(athleteId);
    }
    navigate("/app/coach/builder");
  }

  async function handleSavePlan(payload) {
    try {
      let res;
      if (payload.planId) {
        res = await updateCoachTrainingPlan(payload.planId, payload);
      } else {
        res = await createCoachTrainingPlan(payload);
      }
      notify?.(
        payload.status === "published"
          ? "Training plan published! Immediately synchronized with athlete."
          : "Training plan draft saved securely."
      );
      // Reload plans and dashboard
      const [newPlans, newDash] = await Promise.all([
        getCoachTrainingPlans(),
        getCoachDashboard(),
      ]);
      setPlans(Array.isArray(newPlans) ? newPlans : newPlans?.plans || []);
      setDashboardData(newDash);

      if (payload.athleteId) {
        loadAthleteDetailData(payload.athleteId);
        navigate(`/app/coach/athletes/${payload.athleteId}`);
      } else {
        navigate("/app/coach/plans");
      }
    } catch (err) {
      notify?.("Failed to save plan: " + err.message, "error");
      throw err;
    }
  }

  async function handlePublishPlan(planId) {
    try {
      await publishCoachTrainingPlan(planId);
      notify?.("Training plan published to athlete!");
      const [newPlans, newDash] = await Promise.all([
        getCoachTrainingPlans(),
        getCoachDashboard(),
      ]);
      setPlans(Array.isArray(newPlans) ? newPlans : newPlans?.plans || []);
      setDashboardData(newDash);
    } catch (err) {
      notify?.("Failed to publish plan: " + err.message, "error");
    }
  }

  async function handleSaveGoals(athleteId, goalsPayload) {
    try {
      await updateCoachAthleteGoals(athleteId, goalsPayload);
      notify?.("Season and monthly goals updated successfully!");
      await loadAthleteDetailData(athleteId);
      const newDash = await getCoachDashboard();
      setDashboardData(newDash);
    } catch (err) {
      notify?.("Failed to update goals: " + err.message, "error");
      throw err;
    }
  }

  async function handleRescheduleSession(planId, payload) {
    try {
      await rescheduleCoachSession(planId, payload);
      notify?.("Session rescheduled successfully with original training record preserved!");
      if (selectedAthleteId) {
        await loadAthleteDetailData(selectedAthleteId);
      }
    } catch (err) {
      notify?.("Failed to reschedule session: " + err.message, "error");
      throw err;
    }
  }

  async function handleSaveProfile(profilePayload) {
    try {
      const res = await updateCoachProfile(profilePayload);
      setCoachProfile(res?.profile || profilePayload);
      notify?.("Coach profile updated successfully!");
    } catch (err) {
      notify?.("Failed to save profile: " + err.message, "error");
      throw err;
    }
  }

  // Authorization Guard
  if (!["coach", "medical"].includes(user?.role) && !user?.demo) {
    return (
      <div className="empty" style={{ padding: "80px 20px", textAlign: "center" }}>
        <ShieldAlert size={48} color="#c92c2c" style={{ margin: "0 auto 16px" }} />
        <h2>Coach & Medical Staff Access Required</h2>
        <p style={{ maxWidth: 500, margin: "10px auto 20px", color: "#6a775b" }}>
          This workspace provides high-performance athlete management, training prescription, and
          medical safety oversight. Your current account role is <strong>{user?.role || "Athlete"}</strong>.
        </p>
        <button className="button dark" onClick={() => navigate("/app/overview")}>
          Return to My Athlete Workspace
        </button>
      </div>
    );
  }

  const TAB_METADATA = {
    dashboard: {
      title: "Coach Dashboard",
      subtitle: "Portfolio performance tracking, periodized training plans, and medical recovery oversight",
    },
    athletes: {
      title: "My Athletes",
      subtitle: "Official athlete roster, biometric compliance, and individual development dossiers",
    },
    "athlete-detail": {
      title: "Athlete Dossier",
      subtitle: "Biometric benchmarks, training adherence history, medical recovery, and goals",
    },
    plans: {
      title: "Training Plans",
      subtitle: "Manage weekly schedules, drafts, and published microcycles across your athlete roster",
    },
    builder: {
      title: "Plan Builder",
      subtitle: "Construct 7-day periodized training microcycles with exercise library integration",
    },
    performance: {
      title: "Performance Hub",
      subtitle: "Cross-athlete timing marks, season personal bests, and national record comparisons",
    },
    recovery: {
      title: "Recovery & Safety Hub",
      subtitle: "Athlete fatigue, soreness logs, active medical flags, and return-to-play monitoring",
    },
    goals: {
      title: "Macro & Meso Goals",
      subtitle: "Track season target trajectories, annual championship goals, and monthly benchmarks",
    },
    roadmaps: {
      title: "Long-Term Roadmaps",
      subtitle: "Multi-year periodization phases, foundation blocks, and national competition milestones",
    },
    notifications: {
      title: "Alerts & Notifications",
      subtitle: "System notifications, safety flag warnings, and athlete check-in updates",
    },
    profile: {
      title: "Coach Profile",
      subtitle: "Professional coaching credentials, certifications, specializations, and affiliations",
    },
  };
  const currentMeta = TAB_METADATA[activeTab] || TAB_METADATA.dashboard;

  return (
    <div className="coach-hub-workspace">
      {/* Sleek Coach Header Bar */}
      <div className="coach-page-header">
        <div className="coach-header-info">
          <div className="coach-header-eyebrow">
            <span className="coach-kicker">COACH WORKSPACE</span>
            <span className="coach-high-perf-badge">HIGH-PERFORMANCE SYSTEM</span>
          </div>
          <h1 className="coach-page-title">
            {currentMeta.title}<span>.</span>
          </h1>
          <p className="coach-page-subtitle">{currentMeta.subtitle}</p>
        </div>

        <div className="coach-header-quick-actions">
          <div className="coach-athlete-jump-box">
            <select
              className="coach-athlete-select"
              value={selectedAthleteId || ""}
              onChange={(e) => {
                if (e.target.value) handleSelectAthlete(e.target.value);
              }}
            >
              <option value="">⚡ Quick Athlete Jump…</option>
              {athletes.map((ath) => (
                <option key={ath.athleteId} value={ath.athleteId}>
                  {ath.name} — {ath.sport} ({ath.event})
                </option>
              ))}
            </select>
          </div>

          <button
            className="button orange"
            onClick={() => handleStartPlanBuilder()}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}
          >
            <Plus size={15} />
            <span>Create Plan</span>
          </button>
        </div>
      </div>

      {/* Sticky Coach Top Navigation Strip - Dedicated Pills Only */}
      <div className="coach-top-nav-bar">
        <div className="coach-nav-tabs-group">
          <button
            className={`coach-nav-pill ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => navigate("/app/coach")}
          >
            <LayoutDashboard size={14} />
            <span>Dashboard</span>
          </button>

          <button
            className={`coach-nav-pill ${activeTab === "athletes" || activeTab === "athlete-detail" ? "active" : ""}`}
            onClick={() => navigate("/app/coach/athletes")}
          >
            <Users size={14} />
            <span>My Athletes</span>
            {athletes.length > 0 && <span className="pill-count">{athletes.length}</span>}
          </button>

          <button
            className={`coach-nav-pill ${activeTab === "plans" ? "active" : ""}`}
            onClick={() => navigate("/app/coach/plans")}
          >
            <Calendar size={14} />
            <span>Training Plans</span>
            {plans.length > 0 && <span className="pill-count">{plans.length}</span>}
          </button>

          <button
            className={`coach-nav-pill ${activeTab === "builder" ? "active" : ""}`}
            onClick={() => navigate("/app/coach/builder")}
          >
            <Plus size={14} />
            <span>Plan Builder</span>
          </button>

          <button
            className={`coach-nav-pill ${activeTab === "performance" ? "active" : ""}`}
            onClick={() => navigate("/app/coach/performance")}
          >
            <Activity size={14} />
            <span>Performance</span>
          </button>

          <button
            className={`coach-nav-pill ${activeTab === "recovery" ? "active" : ""}`}
            onClick={() => navigate("/app/coach/recovery")}
          >
            <HeartPulse size={14} />
            <span>Recovery & Safety</span>
            {dashboardData?.summary?.safetyFlags > 0 && (
              <span className="pill-dot danger" title={`${dashboardData.summary.safetyFlags} safety flags active`} />
            )}
          </button>

          <button
            className={`coach-nav-pill ${activeTab === "goals" ? "active" : ""}`}
            onClick={() => navigate("/app/coach/goals")}
          >
            <Target size={14} />
            <span>Goals</span>
          </button>

          <button
            className={`coach-nav-pill ${activeTab === "roadmaps" ? "active" : ""}`}
            onClick={() => navigate("/app/coach/roadmaps")}
          >
            <Compass size={14} />
            <span>Roadmaps</span>
          </button>

          <button
            className={`coach-nav-pill ${activeTab === "notifications" ? "active" : ""}`}
            onClick={() => navigate("/app/coach/notifications")}
          >
            <Bell size={14} />
            <span>Alerts</span>
            {notifications.length > 0 && <span className="pill-count">{notifications.length}</span>}
          </button>

          <button
            className={`coach-nav-pill ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => navigate("/app/coach/profile")}
          >
            <User size={14} />
            <span>Coach Profile</span>
          </button>
        </div>
      </div>

      {/* Primary Coach View Switcher */}
      {activeTab === "dashboard" && (
        <CoachDashboardView
          dashboardData={dashboardData}
          onSelectAthlete={handleSelectAthlete}
          onNavigateTab={(tab) => navigate(`/app/coach/${tab}`)}
          onStartPlanBuilder={handleStartPlanBuilder}
        />
      )}

      {activeTab === "athletes" && (
        <CoachAthletesView
          athletes={athletes}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sportFilter={sportFilter}
          onSportFilterChange={setSportFilter}
          onSelectAthlete={handleSelectAthlete}
          onStartPlanBuilder={handleStartPlanBuilder}
        />
      )}

      {activeTab === "athlete-detail" && (
        <CoachAthleteDetailView
          athleteDetail={athleteDetail}
          loading={loadingDetail}
          onBack={() => navigate("/app/coach/athletes")}
          onStartPlanBuilder={handleStartPlanBuilder}
          onSaveGoals={handleSaveGoals}
          onRescheduleSession={handleRescheduleSession}
          notify={notify}
        />
      )}

      {activeTab === "plans" && (
        <CoachTrainingPlansView
          plans={plans}
          athletes={athletes}
          loading={loading}
          onStartPlanBuilder={handleStartPlanBuilder}
          onPublishPlan={handlePublishPlan}
          onSelectAthlete={handleSelectAthlete}
          notify={notify}
        />
      )}

      {activeTab === "builder" && (
        <CoachPlanBuilderView
          athletes={athletes}
          preselectedAthleteId={selectedAthleteId}
          onCancel={() => navigate("/app/coach/plans")}
          onSavePlan={handleSavePlan}
          notify={notify}
        />
      )}

      {activeTab === "performance" && (
        <CoachPerformanceHubView
          athletes={athletes}
          onSelectAthlete={handleSelectAthlete}
        />
      )}

      {activeTab === "recovery" && (
        <CoachRecoveryHubView
          athletes={athletes}
          onSelectAthlete={handleSelectAthlete}
        />
      )}

      {activeTab === "goals" && (
        <CoachGoalsHubView
          athletes={athletes}
          onSelectAthlete={handleSelectAthlete}
        />
      )}

      {activeTab === "roadmaps" && (
        <CoachRoadmapsHubView
          athletes={athletes}
          onSelectAthlete={handleSelectAthlete}
        />
      )}

      {activeTab === "notifications" && (
        <CoachNotificationsView
          notifications={notifications}
          loading={loading}
          onSelectAthlete={handleSelectAthlete}
        />
      )}

      {activeTab === "profile" && (
        <CoachProfileView
          profile={coachProfile}
          loading={loading}
          onSaveProfile={handleSaveProfile}
          notify={notify}
        />
      )}
    </div>
  );
}
