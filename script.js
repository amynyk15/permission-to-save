document.addEventListener("DOMContentLoaded", () => {
  const navItems = document.querySelectorAll(".menu-item[data-target]");
  const pageSections = document.querySelectorAll(".page-section");
  const sidebarPanel = document.querySelector(".sidebar");

  const pageTitleMap = {
    dashboard: "Dashboard",
    transactions: "Transactions",
    "monthly-snapshot": "Monthly Snapshot",
    "budget-planner": "Budget Planner",
    "saving-goals": "Saving Goals",
    "subscription-tracking": "Subscription Tracking",
    settings: "Settings",
    "investment-tracking": "Investment Tracking",
    "net-worth-tracking": "Net Worth Tracking",
    analytics: "Analytics",
  };

  const STORAGE_KEY = "permissionToSaveTransactions";
  const BUDGET_STORAGE_KEY = "permissionToSaveBudgets";
  const GOALS_STORAGE_KEY = "permissionToSaveSavingGoals";
  const SUBSCRIPTION_STORAGE_KEY = "permissionToSaveSubscriptions";
  const SETTINGS_STORAGE_KEY = "permissionToSaveSettings";
  const NET_WORTH_STORAGE_KEY = "permissionToSaveNetWorthItems";
  const INVESTMENT_STORAGE_KEY = "permissionToSaveInvestments";
  const THEME_STORAGE_KEY = "permissionToSaveTheme";
  const SELECTED_MONTH_STORAGE_KEY = "permissionToSaveSelectedMonth";
  const PLANNING_MONTHS_STORAGE_KEY = "permissionToSavePlanningMonths";

  const SUPABASE_URL = "https://anpyelyilcmaklhhaibg.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucHllbHlpbGNtYWtsaGhhaWJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MTc4MzIsImV4cCI6MjA5Njk5MzgzMn0.54Sci6Mw2uchIbrYsvVNJzbDUR7zfgia92IQr4QTwwU";

  const supabaseClient =
    window.supabase && SUPABASE_URL !== "貼上你的 Project URL"
      ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      : null;

  let currentCloudUser = null;

  let editingTransactionId = null;
  let editingGoalId = null;
  let editingSubscriptionId = null;
  let editingNetWorthId = null;
  let editingInvestmentId = null;

  function createId() {
    if (window.crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    return `id-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  const defaultTransactions = [];

  const defaultBudgets = {
    "Food & Dining": 3000,
    Transportation: 1000,
    Shopping: 1500,
    Subscription: 500,
    Entertainment: 800,
    Health: 600,
    Others: 1000,
  };

  const defaultSavingGoals = [];

  const defaultSubscriptions = [];

  const defaultSettings = {
    categories: [
      { id: createId(), name: "Salary", type: "Income" },
      { id: createId(), name: "Food & Dining", type: "Expense" },
      { id: createId(), name: "Transportation", type: "Expense" },
      { id: createId(), name: "Shopping", type: "Expense" },
      { id: createId(), name: "Subscription", type: "Expense" },
      { id: createId(), name: "Investment", type: "Investment" },
    ],

    accounts: [
      { id: createId(), name: "Bank", type: "Bank" },
      { id: createId(), name: "Credit Card", type: "Credit Card" },
      { id: createId(), name: "Octopus", type: "E-Wallet" },
      { id: createId(), name: "Cash", type: "Cash" },
    ],
  };

  const defaultNetWorthItems = [];

  const defaultInvestments = [];

  let transactions = loadTransactions();
  let budgets = loadBudgets();
  let savingGoals = loadSavingGoals();
  let subscriptions = loadSubscriptions();
  let settings = loadSettings();
  let netWorthItems = loadNetWorthItems();
  let investments = loadInvestments();

  let selectedMonth = loadSelectedMonth();
  let planningMonths = loadPlanningMonths();

  let moneyFlowView = "monthly";

  // =========================
  // BASIC HELPERS
  // =========================

  function padTwoDigits(value) {
    return String(value).padStart(2, "0");
  }

  function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = padTwoDigits(today.getMonth() + 1);
    const day = padTwoDigits(today.getDate());

    return `${year}-${month}-${day}`;
  }

  function getCurrentMonthString() {
    return getTodayDateString().slice(0, 7);
  }

  function getFirstDateOfMonth(month) {
    return `${month}-01`;
  }

  function getDefaultDateForSelectedMonth() {
    const today = getTodayDateString();
    const currentSelectedMonth = selectedMonth || getCurrentMonthString();

    if (today.slice(0, 7) === currentSelectedMonth) {
      return today;
    }

    return getFirstDateOfMonth(currentSelectedMonth);
  }

  function getDefaultGoalDeadline() {
    const today = new Date();
    const year = today.getFullYear();

    return `${year}-12-31`;
  }

  function showToast(message, type = "success") {
    const toastContainer = document.getElementById("toastContainer");

    if (!toastContainer) return;

    const iconMap = {
      success: "check-circle",
      error: "circle-alert",
      warning: "triangle-alert",
      info: "info",
    };

    const iconName = iconMap[type] || iconMap.success;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span>${message}</span>
    <button type="button" aria-label="Close notification">
      <i data-lucide="x"></i>
    </button>
  `;

    toastContainer.appendChild(toast);

    const closeToast = () => {
      toast.classList.add("is-leaving");

      setTimeout(() => {
        toast.remove();
      }, 200);
    };

    const closeButton = toast.querySelector("button");

    if (closeButton) {
      closeButton.addEventListener("click", closeToast);
    }

    setTimeout(closeToast, 3200);

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  function updateCloudAuthUI() {
    const cloudLoggedOutBox = document.getElementById("cloudLoggedOutBox");
    const cloudLoggedInBox = document.getElementById("cloudLoggedInBox");
    const cloudUserEmail = document.getElementById("cloudUserEmail");

    if (!cloudLoggedOutBox || !cloudLoggedInBox || !cloudUserEmail) return;

    if (currentCloudUser) {
      cloudLoggedOutBox.classList.add("hidden");
      cloudLoggedInBox.classList.remove("hidden");
      cloudUserEmail.textContent = currentCloudUser.email || "Signed in";
    } else {
      cloudLoggedOutBox.classList.remove("hidden");
      cloudLoggedInBox.classList.add("hidden");
      cloudUserEmail.textContent = "Not signed in";
    }

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  async function handleCloudAuthCallback() {
    if (!supabaseClient) {
      updateCloudAuthUI();
      return;
    }

    const currentUrl = new URL(window.location.href);
    const authCode = currentUrl.searchParams.get("code");

    if (!authCode) return;

    const { error } =
      await supabaseClient.auth.exchangeCodeForSession(authCode);

    if (error) {
      console.error(error);
      showToast("Unable to complete cloud login.", "error");
      return;
    }

    window.history.replaceState({}, document.title, window.location.pathname);

    showToast("Cloud login completed.", "success");
  }

  async function loadCloudSession() {
    if (!supabaseClient) {
      updateCloudAuthUI();
      return;
    }

    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      console.error(error);
      showToast("Unable to check cloud login session.", "error");
      return;
    }

    currentCloudUser = data.session ? data.session.user : null;
    updateCloudAuthUI();
  }

  async function sendCloudLoginLink() {
    if (!supabaseClient) {
      showToast("Supabase is not configured yet.", "warning");
      return;
    }

    const cloudEmailInput = document.getElementById("cloudEmailInput");
    const email = cloudEmailInput ? cloudEmailInput.value.trim() : "";

    if (!email) {
      showToast("Please enter your email address.", "error");
      return;
    }

    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
      },
    });

    if (error) {
      console.error(error);
      showToast("Unable to send login link.", "error");
      return;
    }

    showToast("Login link sent. Please check your email.", "success");
  }

  async function logoutCloudAccount() {
    if (!supabaseClient) return;

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      console.error(error);
      showToast("Unable to logout.", "error");
      return;
    }

    currentCloudUser = null;
    updateCloudAuthUI();
    showToast("Logged out successfully.", "success");
  }

  function updateCloudSyncStatus(message) {
    const cloudSyncStatus = document.getElementById("cloudSyncStatus");

    if (cloudSyncStatus) {
      cloudSyncStatus.textContent = message;
    }
  }

  function canUseCloudSync() {
    if (!supabaseClient) {
      showToast("Supabase is not configured yet.", "warning");
      return false;
    }

    if (!currentCloudUser) {
      showToast("Please login before using cloud sync.", "warning");
      return false;
    }

    return true;
  }

  function mapLocalTransactionToCloudRow(transaction) {
    return {
      user_id: currentCloudUser.id,
      local_id: transaction.id,
      date: transaction.date,
      type: transaction.type,
      description: transaction.description,
      category: transaction.category,
      account: transaction.account,
      amount: Number(transaction.amount),
      status: transaction.status,
      source: transaction.source || null,
      subscription_id: transaction.subscriptionId || null,
    };
  }

  function mapCloudRowToLocalTransaction(row) {
    return {
      id: row.local_id || row.id,
      date: row.date,
      type: row.type,
      description: row.description,
      category: row.category,
      account: row.account,
      amount: Number(row.amount),
      status: row.status,
      source: row.source || "",
      subscriptionId: row.subscription_id || "",
    };
  }

  async function uploadTransactionsToCloud() {
    if (!canUseCloudSync()) return;

    const confirmed = confirm(
      `Upload ${transactions.length} local transaction(s) to cloud?\n\nThis will replace your existing cloud transactions.`,
    );

    if (!confirmed) return;

    updateCloudSyncStatus("Uploading transactions to cloud...");

    const { error: deleteError } = await supabaseClient
      .from("transactions")
      .delete()
      .eq("user_id", currentCloudUser.id);

    if (deleteError) {
      console.error(deleteError);
      showToast("Unable to clear cloud transactions.", "error");
      updateCloudSyncStatus("Upload failed.");
      return;
    }

    if (transactions.length === 0) {
      showToast("Cloud transactions cleared.", "success");
      updateCloudSyncStatus("Cloud transactions cleared.");
      return;
    }

    const cloudRows = transactions.map(mapLocalTransactionToCloudRow);

    const { error: insertError } = await supabaseClient
      .from("transactions")
      .insert(cloudRows);

    if (insertError) {
      console.error(insertError);
      showToast("Unable to upload transactions to cloud.", "error");
      updateCloudSyncStatus("Upload failed.");
      return;
    }

    showToast("Transactions uploaded to cloud successfully.", "success");
    updateCloudSyncStatus(
      `${transactions.length} transaction(s) uploaded to cloud.`,
    );
  }

  async function loadTransactionsFromCloud() {
    if (!canUseCloudSync()) return;

    const confirmed = confirm(
      "Load transactions from cloud?\n\nThis will replace your current local transactions.",
    );

    if (!confirmed) return;

    updateCloudSyncStatus("Loading transactions from cloud...");

    const { data, error } = await supabaseClient
      .from("transactions")
      .select("*")
      .order("date", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      showToast("Unable to load transactions from cloud.", "error");
      updateCloudSyncStatus("Load failed.");
      return;
    }

    transactions = (data || []).map(mapCloudRowToLocalTransaction);

    saveTransactions();
    renderTransactions();
    syncMonthSelectors();
    renderMonthlySnapshot();
    renderBudgetPlanner();
    renderDashboard();
    renderAnalytics();

    showToast("Transactions loaded from cloud successfully.", "success");
    updateCloudSyncStatus(
      `${transactions.length} transaction(s) loaded from cloud.`,
    );
  }

  function canAutoSyncTransactions() {
    return Boolean(supabaseClient && currentCloudUser);
  }

  function updateCloudAutoSyncStatus(message) {
    updateCloudSyncStatus(message);
  }

  async function upsertTransactionToCloud(transaction) {
    if (!canAutoSyncTransactions()) {
      console.log("Auto sync skipped: not logged in or Supabase not ready.");
      return;
    }

    if (!transaction) {
      console.log("Auto sync skipped: transaction is empty.");
      return;
    }

    const cloudRow = mapLocalTransactionToCloudRow(transaction);

    console.log("Auto sync transaction:", cloudRow);

    const { data, error } = await supabaseClient
      .from("transactions")
      .upsert(cloudRow, {
        onConflict: "user_id,local_id",
      })
      .select();

    console.log("Auto sync result:", {
      data,
      error,
    });

    if (error) {
      console.error(error);
      showToast("Transaction cloud auto sync failed.", "error");
      updateCloudAutoSyncStatus("Auto sync failed.");
      return;
    }

    updateCloudAutoSyncStatus("Last transaction auto synced to cloud.");
  }

  async function deleteTransactionFromCloud(transactionId) {
    if (!canAutoSyncTransactions()) return;
    if (!transactionId) return;

    const { error } = await supabaseClient
      .from("transactions")
      .delete()
      .eq("user_id", currentCloudUser.id)
      .eq("local_id", transactionId);

    if (error) {
      console.error(error);
      showToast("Unable to delete transaction from cloud.", "error");
      updateCloudAutoSyncStatus("Cloud delete failed.");
      return;
    }

    updateCloudAutoSyncStatus("Transaction deleted from cloud.");
  }

  function canAutoSyncBudgets() {
    return Boolean(supabaseClient && currentCloudUser);
  }

  function getBudgetCloudRows() {
    const rows = [];

    Object.entries(budgets).forEach(([month, monthBudget]) => {
      if (!isValidMonthFormat(month)) return;
      if (!isPlainObject(monthBudget)) return;

      Object.entries(monthBudget).forEach(([category, planned]) => {
        rows.push({
          user_id: currentCloudUser.id,
          month,
          category,
          planned: Number(planned) || 0,
        });
      });
    });

    return rows;
  }

  function getBudgetCloudRowsForMonth(month) {
    const monthBudget = getBudgetForMonth(month);

    return Object.entries(monthBudget).map(([category, planned]) => {
      return {
        user_id: currentCloudUser.id,
        month,
        category,
        planned: Number(planned) || 0,
      };
    });
  }

  function mapCloudRowsToBudgets(rows) {
    const cloudBudgets = {};

    rows.forEach((row) => {
      if (!cloudBudgets[row.month]) {
        cloudBudgets[row.month] = {};
      }

      cloudBudgets[row.month][row.category] = Number(row.planned);
    });

    return normalizeBudgets(cloudBudgets);
  }

  async function uploadBudgetsToCloud() {
    if (!canUseCloudSync()) return;

    const cloudRows = getBudgetCloudRows();

    const confirmed = confirm(
      `Upload ${cloudRows.length} budget record(s) to cloud?\n\nThis will replace your existing cloud budgets.`,
    );

    if (!confirmed) return;

    updateCloudSyncStatus("Uploading budgets to cloud...");

    const { error: deleteError } = await supabaseClient
      .from("budgets")
      .delete()
      .eq("user_id", currentCloudUser.id);

    if (deleteError) {
      console.error(deleteError);
      showToast("Unable to clear cloud budgets.", "error");
      updateCloudSyncStatus("Budget upload failed.");
      return;
    }

    if (cloudRows.length === 0) {
      showToast("Cloud budgets cleared.", "success");
      updateCloudSyncStatus("Cloud budgets cleared.");
      return;
    }

    const { error: insertError } = await supabaseClient
      .from("budgets")
      .insert(cloudRows);

    if (insertError) {
      console.error(insertError);
      showToast("Unable to upload budgets to cloud.", "error");
      updateCloudSyncStatus("Budget upload failed.");
      return;
    }

    showToast("Budgets uploaded to cloud successfully.", "success");
    updateCloudSyncStatus(`${cloudRows.length} budget record(s) uploaded.`);
  }

  async function loadBudgetsFromCloud() {
    if (!canUseCloudSync()) return;

    const confirmed = confirm(
      "Load budgets from cloud?\n\nThis will replace your current local budgets.",
    );

    if (!confirmed) return;

    updateCloudSyncStatus("Loading budgets from cloud...");

    const { data, error } = await supabaseClient
      .from("budgets")
      .select("*")
      .order("month", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      showToast("Unable to load budgets from cloud.", "error");
      updateCloudSyncStatus("Budget load failed.");
      return;
    }

    budgets = mapCloudRowsToBudgets(data || []);

    saveBudgets();
    syncMonthSelectors();
    renderBudgetPlanner();
    renderDashboard();

    showToast("Budgets loaded from cloud successfully.", "success");
    updateCloudSyncStatus(`${data.length} budget record(s) loaded.`);
  }

  async function syncBudgetMonthToCloud(month) {
    if (!canAutoSyncBudgets()) return;
    if (!month) return;

    const cloudRows = getBudgetCloudRowsForMonth(month);

    const { error: deleteError } = await supabaseClient
      .from("budgets")
      .delete()
      .eq("user_id", currentCloudUser.id)
      .eq("month", month);

    if (deleteError) {
      console.error(deleteError);
      showToast("Budget cloud auto sync failed.", "error");
      updateCloudSyncStatus("Budget auto sync failed.");
      return;
    }

    if (cloudRows.length === 0) {
      updateCloudSyncStatus(`Budget for ${month} cleared from cloud.`);
      return;
    }

    const { error: insertError } = await supabaseClient
      .from("budgets")
      .insert(cloudRows);

    if (insertError) {
      console.error(insertError);
      showToast("Budget cloud auto sync failed.", "error");
      updateCloudSyncStatus("Budget auto sync failed.");
      return;
    }

    updateCloudSyncStatus(`Budget for ${month} auto synced to cloud.`);
  }

  function canAutoSyncSavingGoals() {
    return Boolean(supabaseClient && currentCloudUser);
  }

  function mapLocalSavingGoalToCloudRow(goal) {
    return {
      user_id: currentCloudUser.id,
      local_id: goal.id,
      name: goal.name,
      target: Number(goal.target),
      current: Number(goal.current),
      deadline: goal.deadline,
      status: goal.status,
    };
  }

  function mapCloudRowToLocalSavingGoal(row) {
    return {
      id: row.local_id || row.id,
      name: row.name,
      target: Number(row.target),
      current: Number(row.current),
      deadline: row.deadline,
      status: row.status,
    };
  }

  async function uploadSavingGoalsToCloud() {
    if (!canUseCloudSync()) return;

    const confirmed = confirm(
      `Upload ${savingGoals.length} saving goal(s) to cloud?\n\nThis will replace your existing cloud saving goals.`,
    );

    if (!confirmed) return;

    updateCloudSyncStatus("Uploading saving goals to cloud...");

    const { error: deleteError } = await supabaseClient
      .from("saving_goals")
      .delete()
      .eq("user_id", currentCloudUser.id);

    if (deleteError) {
      console.error(deleteError);
      showToast("Unable to clear cloud saving goals.", "error");
      updateCloudSyncStatus("Saving goals upload failed.");
      return;
    }

    if (savingGoals.length === 0) {
      showToast("Cloud saving goals cleared.", "success");
      updateCloudSyncStatus("Cloud saving goals cleared.");
      return;
    }

    const cloudRows = savingGoals.map(mapLocalSavingGoalToCloudRow);

    const { error: insertError } = await supabaseClient
      .from("saving_goals")
      .insert(cloudRows);

    if (insertError) {
      console.error(insertError);
      showToast("Unable to upload saving goals to cloud.", "error");
      updateCloudSyncStatus("Saving goals upload failed.");
      return;
    }

    showToast("Saving goals uploaded to cloud successfully.", "success");
    updateCloudSyncStatus(`${savingGoals.length} saving goal(s) uploaded.`);
  }

  async function loadSavingGoalsFromCloud() {
    if (!canUseCloudSync()) return;

    const confirmed = confirm(
      "Load saving goals from cloud?\n\nThis will replace your current local saving goals.",
    );

    if (!confirmed) return;

    updateCloudSyncStatus("Loading saving goals from cloud...");

    const { data, error } = await supabaseClient
      .from("saving_goals")
      .select("*")
      .order("deadline", {
        ascending: true,
      });

    if (error) {
      console.error(error);
      showToast("Unable to load saving goals from cloud.", "error");
      updateCloudSyncStatus("Saving goals load failed.");
      return;
    }

    savingGoals = (data || []).map(mapCloudRowToLocalSavingGoal);

    saveSavingGoals();
    renderSavingGoals();
    renderDashboard();

    showToast("Saving goals loaded from cloud successfully.", "success");
    updateCloudSyncStatus(`${savingGoals.length} saving goal(s) loaded.`);
  }

  async function upsertSavingGoalToCloud(goal) {
    if (!canAutoSyncSavingGoals()) return;
    if (!goal) return;

    const cloudRow = mapLocalSavingGoalToCloudRow(goal);

    const { error } = await supabaseClient
      .from("saving_goals")
      .upsert(cloudRow, {
        onConflict: "user_id,local_id",
      });

    if (error) {
      console.error(error);
      showToast("Saving goal cloud auto sync failed.", "error");
      updateCloudSyncStatus("Saving goal auto sync failed.");
      return;
    }

    updateCloudSyncStatus("Saving goal auto synced to cloud.");
  }

  async function deleteSavingGoalFromCloud(goalId) {
    if (!canAutoSyncSavingGoals()) return;
    if (!goalId) return;

    const { error } = await supabaseClient
      .from("saving_goals")
      .delete()
      .eq("user_id", currentCloudUser.id)
      .eq("local_id", goalId);

    if (error) {
      console.error(error);
      showToast("Unable to delete saving goal from cloud.", "error");
      updateCloudSyncStatus("Saving goal cloud delete failed.");
      return;
    }

    updateCloudSyncStatus("Saving goal deleted from cloud.");
  }

  function canAutoSyncSubscriptions() {
    return Boolean(supabaseClient && currentCloudUser);
  }

  function mapLocalSubscriptionToCloudRow(subscription) {
    return {
      user_id: currentCloudUser.id,
      local_id: subscription.id,
      item: subscription.item,
      plan: subscription.plan,
      fee: Number(subscription.fee),
      cycle: subscription.cycle,
      next_date: subscription.nextDate,
      status: subscription.status,
    };
  }

  function mapCloudRowToLocalSubscription(row) {
    return {
      id: row.local_id || row.id,
      item: row.item,
      plan: row.plan,
      fee: Number(row.fee),
      cycle: row.cycle,
      nextDate: row.next_date,
      status: row.status,
    };
  }

  async function uploadSubscriptionsToCloud() {
    if (!canUseCloudSync()) return;

    const confirmed = confirm(
      `Upload ${subscriptions.length} subscription(s) to cloud?\n\nThis will replace your existing cloud subscriptions.`,
    );

    if (!confirmed) return;

    updateCloudSyncStatus("Uploading subscriptions to cloud...");

    const { error: deleteError } = await supabaseClient
      .from("subscriptions")
      .delete()
      .eq("user_id", currentCloudUser.id);

    if (deleteError) {
      console.error(deleteError);
      showToast("Unable to clear cloud subscriptions.", "error");
      updateCloudSyncStatus("Subscriptions upload failed.");
      return;
    }

    if (subscriptions.length === 0) {
      showToast("Cloud subscriptions cleared.", "success");
      updateCloudSyncStatus("Cloud subscriptions cleared.");
      return;
    }

    const cloudRows = subscriptions.map(mapLocalSubscriptionToCloudRow);

    const { error: insertError } = await supabaseClient
      .from("subscriptions")
      .insert(cloudRows);

    if (insertError) {
      console.error(insertError);
      showToast("Unable to upload subscriptions to cloud.", "error");
      updateCloudSyncStatus("Subscriptions upload failed.");
      return;
    }

    showToast("Subscriptions uploaded to cloud successfully.", "success");
    updateCloudSyncStatus(`${subscriptions.length} subscription(s) uploaded.`);
  }

  async function loadSubscriptionsFromCloud() {
    if (!canUseCloudSync()) return;

    const confirmed = confirm(
      "Load subscriptions from cloud?\n\nThis will replace your current local subscriptions.",
    );

    if (!confirmed) return;

    updateCloudSyncStatus("Loading subscriptions from cloud...");

    const { data, error } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .order("next_date", {
        ascending: true,
      });

    if (error) {
      console.error(error);
      showToast("Unable to load subscriptions from cloud.", "error");
      updateCloudSyncStatus("Subscriptions load failed.");
      return;
    }

    subscriptions = (data || []).map(mapCloudRowToLocalSubscription);

    saveSubscriptions();
    renderSubscriptions();
    renderDashboard();

    showToast("Subscriptions loaded from cloud successfully.", "success");
    updateCloudSyncStatus(`${subscriptions.length} subscription(s) loaded.`);
  }

  async function upsertSubscriptionToCloud(subscription) {
    if (!canAutoSyncSubscriptions()) return;
    if (!subscription) return;

    const cloudRow = mapLocalSubscriptionToCloudRow(subscription);

    const { error } = await supabaseClient
      .from("subscriptions")
      .upsert(cloudRow, {
        onConflict: "user_id,local_id",
      });

    if (error) {
      console.error(error);
      showToast("Subscription cloud auto sync failed.", "error");
      updateCloudSyncStatus("Subscription auto sync failed.");
      return;
    }

    updateCloudSyncStatus("Subscription auto synced to cloud.");
  }

  async function deleteSubscriptionFromCloud(subscriptionId) {
    if (!canAutoSyncSubscriptions()) return;
    if (!subscriptionId) return;

    const { error } = await supabaseClient
      .from("subscriptions")
      .delete()
      .eq("user_id", currentCloudUser.id)
      .eq("local_id", subscriptionId);

    if (error) {
      console.error(error);
      showToast("Unable to delete subscription from cloud.", "error");
      updateCloudSyncStatus("Subscription cloud delete failed.");
      return;
    }

    updateCloudSyncStatus("Subscription deleted from cloud.");
  }

  function getSettingsCloudRows() {
    const categoryRows = (settings.categories || []).map((category) => {
      return {
        user_id: currentCloudUser.id,
        item_type: "category",
        local_id: category.id,
        name: category.name,
        value_type: category.type,
      };
    });

    const accountRows = (settings.accounts || []).map((account) => {
      return {
        user_id: currentCloudUser.id,
        item_type: "account",
        local_id: account.id,
        name: account.name,
        value_type: account.type,
      };
    });

    return [...categoryRows, ...accountRows];
  }

  function mapCloudRowsToSettings(rows) {
    const cloudSettings = {
      categories: [],
      accounts: [],
    };

    rows.forEach((row) => {
      if (row.item_type === "category") {
        cloudSettings.categories.push({
          id: row.local_id || createId(),
          name: row.name,
          type: row.value_type,
        });
      }

      if (row.item_type === "account") {
        cloudSettings.accounts.push({
          id: row.local_id || createId(),
          name: row.name,
          type: row.value_type,
        });
      }
    });

    return cloudSettings;
  }

  async function uploadSettingsToCloud() {
    if (!canUseCloudSync()) return;

    const cloudRows = getSettingsCloudRows();

    const confirmed = confirm(
      `Upload ${cloudRows.length} setting item(s) to cloud?\n\nThis will replace your existing cloud settings.`,
    );

    if (!confirmed) return;

    updateCloudSyncStatus("Uploading settings to cloud...");

    const { error: deleteError } = await supabaseClient
      .from("settings_items")
      .delete()
      .eq("user_id", currentCloudUser.id);

    if (deleteError) {
      console.error(deleteError);
      showToast("Unable to clear cloud settings.", "error");
      updateCloudSyncStatus("Settings upload failed.");
      return;
    }

    if (cloudRows.length === 0) {
      showToast("Cloud settings cleared.", "success");
      updateCloudSyncStatus("Cloud settings cleared.");
      return;
    }

    const { error: insertError } = await supabaseClient
      .from("settings_items")
      .insert(cloudRows);

    if (insertError) {
      console.error(insertError);
      showToast("Unable to upload settings to cloud.", "error");
      updateCloudSyncStatus("Settings upload failed.");
      return;
    }

    showToast("Settings uploaded to cloud successfully.", "success");
    updateCloudSyncStatus(`${cloudRows.length} setting item(s) uploaded.`);
  }

  async function loadSettingsFromCloud() {
    if (!canUseCloudSync()) return;

    const confirmed = confirm(
      "Load settings from cloud?\n\nThis will replace your current local categories and accounts.",
    );

    if (!confirmed) return;

    updateCloudSyncStatus("Loading settings from cloud...");

    const { data, error } = await supabaseClient
      .from("settings_items")
      .select("*")
      .order("item_type", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      });

    if (error) {
      console.error(error);
      showToast("Unable to load settings from cloud.", "error");
      updateCloudSyncStatus("Settings load failed.");
      return;
    }

    const cloudSettings = mapCloudRowsToSettings(data || []);

    settings = cloudSettings;

    saveSettings();
    renderSettings();
    populateTransactionDropdowns();
    renderBudgetPlanner();
    renderTransactions();
    renderDashboard();

    showToast("Settings loaded from cloud successfully.", "success");
    updateCloudSyncStatus(`${data.length} setting item(s) loaded.`);
  }

  function canAutoSyncSettings() {
    return Boolean(supabaseClient && currentCloudUser);
  }

  function mapSettingItemToCloudRow(itemType, item) {
    return {
      user_id: currentCloudUser.id,
      item_type: itemType,
      local_id: item.id,
      name: item.name,
      value_type: item.type,
    };
  }

  async function upsertSettingItemToCloud(itemType, item) {
    if (!canAutoSyncSettings()) return;
    if (!item) return;

    const cloudRow = mapSettingItemToCloudRow(itemType, item);

    const { error } = await supabaseClient
      .from("settings_items")
      .upsert(cloudRow, {
        onConflict: "user_id,item_type,local_id",
      });

    if (error) {
      console.error(error);
      showToast("Settings cloud auto sync failed.", "error");
      updateCloudSyncStatus("Settings auto sync failed.");
      return;
    }

    updateCloudSyncStatus("Settings item auto synced to cloud.");
  }

  async function deleteSettingItemFromCloud(itemType, localId) {
    if (!canAutoSyncSettings()) return;
    if (!localId) return;

    const { error } = await supabaseClient
      .from("settings_items")
      .delete()
      .eq("user_id", currentCloudUser.id)
      .eq("item_type", itemType)
      .eq("local_id", localId);

    if (error) {
      console.error(error);
      showToast("Unable to delete settings item from cloud.", "error");
      updateCloudSyncStatus("Settings cloud delete failed.");
      return;
    }

    updateCloudSyncStatus("Settings item deleted from cloud.");
  }

  async function replaceCloudTransactionsSilently() {
    if (!canAutoSyncTransactions()) return;

    const { error: deleteError } = await supabaseClient
      .from("transactions")
      .delete()
      .eq("user_id", currentCloudUser.id);

    if (deleteError) {
      console.error(deleteError);
      updateCloudSyncStatus("Transactions cascade sync failed.");
      return;
    }

    if (transactions.length === 0) {
      updateCloudSyncStatus(
        "Cloud transactions cleared after settings change.",
      );
      return;
    }

    const cloudRows = transactions.map(mapLocalTransactionToCloudRow);

    const { error: insertError } = await supabaseClient
      .from("transactions")
      .insert(cloudRows);

    if (insertError) {
      console.error(insertError);
      updateCloudSyncStatus("Transactions cascade sync failed.");
      return;
    }

    updateCloudSyncStatus("Transactions cascade synced to cloud.");
  }

  async function replaceCloudBudgetsSilently() {
    if (!canAutoSyncBudgets()) return;

    const cloudRows = getBudgetCloudRows();

    const { error: deleteError } = await supabaseClient
      .from("budgets")
      .delete()
      .eq("user_id", currentCloudUser.id);

    if (deleteError) {
      console.error(deleteError);
      updateCloudSyncStatus("Budgets cascade sync failed.");
      return;
    }

    if (cloudRows.length === 0) {
      updateCloudSyncStatus("Cloud budgets cleared after settings change.");
      return;
    }

    const { error: insertError } = await supabaseClient
      .from("budgets")
      .insert(cloudRows);

    if (insertError) {
      console.error(insertError);
      updateCloudSyncStatus("Budgets cascade sync failed.");
      return;
    }

    updateCloudSyncStatus("Budgets cascade synced to cloud.");
  }

  function canAutoSyncNetWorth() {
    return Boolean(supabaseClient && currentCloudUser);
  }

  function mapLocalNetWorthItemToCloudRow(item) {
    return {
      user_id: currentCloudUser.id,
      local_id: item.id,
      name: item.name,
      type: item.type,
      category: item.category,
      amount: Number(item.amount),
      updated_date: item.updatedDate,
    };
  }

  function mapCloudRowToLocalNetWorthItem(row) {
    return {
      id: row.local_id || row.id,
      name: row.name,
      type: row.type,
      category: row.category,
      amount: Number(row.amount),
      updatedDate: row.updated_date,
    };
  }

  async function uploadNetWorthToCloud() {
    if (!canUseCloudSync()) return;

    const confirmed = confirm(
      `Upload ${netWorthItems.length} net worth item(s) to cloud?\n\nThis will replace your existing cloud net worth items.`,
    );

    if (!confirmed) return;

    updateCloudSyncStatus("Uploading net worth items to cloud...");

    const { error: deleteError } = await supabaseClient
      .from("net_worth_items")
      .delete()
      .eq("user_id", currentCloudUser.id);

    if (deleteError) {
      console.error(deleteError);
      showToast("Unable to clear cloud net worth items.", "error");
      updateCloudSyncStatus("Net worth upload failed.");
      return;
    }

    if (netWorthItems.length === 0) {
      showToast("Cloud net worth items cleared.", "success");
      updateCloudSyncStatus("Cloud net worth items cleared.");
      return;
    }

    const cloudRows = netWorthItems.map(mapLocalNetWorthItemToCloudRow);

    const { error: insertError } = await supabaseClient
      .from("net_worth_items")
      .insert(cloudRows);

    if (insertError) {
      console.error(insertError);
      showToast("Unable to upload net worth items to cloud.", "error");
      updateCloudSyncStatus("Net worth upload failed.");
      return;
    }

    showToast("Net worth items uploaded to cloud successfully.", "success");
    updateCloudSyncStatus(
      `${netWorthItems.length} net worth item(s) uploaded.`,
    );
  }

  async function loadNetWorthFromCloud() {
    if (!canUseCloudSync()) return;

    const confirmed = confirm(
      "Load net worth items from cloud?\n\nThis will replace your current local net worth items.",
    );

    if (!confirmed) return;

    updateCloudSyncStatus("Loading net worth items from cloud...");

    const { data, error } = await supabaseClient
      .from("net_worth_items")
      .select("*")
      .order("updated_date", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      showToast("Unable to load net worth items from cloud.", "error");
      updateCloudSyncStatus("Net worth load failed.");
      return;
    }

    netWorthItems = (data || []).map(mapCloudRowToLocalNetWorthItem);

    saveNetWorthItems();
    renderNetWorthTracking();
    renderDashboard();

    showToast("Net worth items loaded from cloud successfully.", "success");
    updateCloudSyncStatus(`${netWorthItems.length} net worth item(s) loaded.`);
  }

  async function upsertNetWorthItemToCloud(item) {
    if (!canAutoSyncNetWorth()) return;
    if (!item) return;

    const cloudRow = mapLocalNetWorthItemToCloudRow(item);

    const { error } = await supabaseClient
      .from("net_worth_items")
      .upsert(cloudRow, {
        onConflict: "user_id,local_id",
      });

    if (error) {
      console.error(error);
      showToast("Net worth cloud auto sync failed.", "error");
      updateCloudSyncStatus("Net worth auto sync failed.");
      return;
    }

    updateCloudSyncStatus("Net worth item auto synced to cloud.");
  }

  async function deleteNetWorthItemFromCloud(itemId) {
    if (!canAutoSyncNetWorth()) return;
    if (!itemId) return;

    const { error } = await supabaseClient
      .from("net_worth_items")
      .delete()
      .eq("user_id", currentCloudUser.id)
      .eq("local_id", itemId);

    if (error) {
      console.error(error);
      showToast("Unable to delete net worth item from cloud.", "error");
      updateCloudSyncStatus("Net worth cloud delete failed.");
      return;
    }

    updateCloudSyncStatus("Net worth item deleted from cloud.");
  }

  function canAutoSyncInvestments() {
    return Boolean(supabaseClient && currentCloudUser);
  }

  function mapLocalInvestmentToCloudRow(investment) {
    return {
      user_id: currentCloudUser.id,
      local_id: investment.id,
      name: investment.name,
      type: investment.type,
      platform: investment.platform,
      cost: Number(investment.cost),
      value: Number(investment.value),
      updated_date: investment.updatedDate,
    };
  }

  function mapCloudRowToLocalInvestment(row) {
    return {
      id: row.local_id || row.id,
      name: row.name,
      type: row.type,
      platform: row.platform,
      cost: Number(row.cost),
      value: Number(row.value),
      updatedDate: row.updated_date,
    };
  }

  async function uploadInvestmentsToCloud() {
    if (!canUseCloudSync()) return;

    const confirmed = confirm(
      `Upload ${investments.length} investment item(s) to cloud?\n\nThis will replace your existing cloud investments.`,
    );

    if (!confirmed) return;

    updateCloudSyncStatus("Uploading investments to cloud...");

    const { error: deleteError } = await supabaseClient
      .from("investment_items")
      .delete()
      .eq("user_id", currentCloudUser.id);

    if (deleteError) {
      console.error(deleteError);
      showToast("Unable to clear cloud investments.", "error");
      updateCloudSyncStatus("Investments upload failed.");
      return;
    }

    if (investments.length === 0) {
      showToast("Cloud investments cleared.", "success");
      updateCloudSyncStatus("Cloud investments cleared.");
      return;
    }

    const cloudRows = investments.map(mapLocalInvestmentToCloudRow);

    const { error: insertError } = await supabaseClient
      .from("investment_items")
      .insert(cloudRows);

    if (insertError) {
      console.error(insertError);
      showToast("Unable to upload investments to cloud.", "error");
      updateCloudSyncStatus("Investments upload failed.");
      return;
    }

    showToast("Investments uploaded to cloud successfully.", "success");
    updateCloudSyncStatus(`${investments.length} investment item(s) uploaded.`);
  }

  async function loadInvestmentsFromCloud() {
    if (!canUseCloudSync()) return;

    const confirmed = confirm(
      "Load investments from cloud?\n\nThis will replace your current local investments.",
    );

    if (!confirmed) return;

    updateCloudSyncStatus("Loading investments from cloud...");

    const { data, error } = await supabaseClient
      .from("investment_items")
      .select("*")
      .order("updated_date", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      showToast("Unable to load investments from cloud.", "error");
      updateCloudSyncStatus("Investments load failed.");
      return;
    }

    investments = (data || []).map(mapCloudRowToLocalInvestment);

    saveInvestments();
    renderInvestmentTracking();
    renderDashboard();

    showToast("Investments loaded from cloud successfully.", "success");
    updateCloudSyncStatus(`${investments.length} investment item(s) loaded.`);
  }

  async function upsertInvestmentToCloud(investment) {
    if (!canAutoSyncInvestments()) return;
    if (!investment) return;

    const cloudRow = mapLocalInvestmentToCloudRow(investment);

    const { error } = await supabaseClient
      .from("investment_items")
      .upsert(cloudRow, {
        onConflict: "user_id,local_id",
      });

    if (error) {
      console.error(error);
      showToast("Investment cloud auto sync failed.", "error");
      updateCloudSyncStatus("Investment auto sync failed.");
      return;
    }

    updateCloudSyncStatus("Investment item auto synced to cloud.");
  }

  async function deleteInvestmentFromCloud(investmentId) {
    if (!canAutoSyncInvestments()) return;
    if (!investmentId) return;

    const { error } = await supabaseClient
      .from("investment_items")
      .delete()
      .eq("user_id", currentCloudUser.id)
      .eq("local_id", investmentId);

    if (error) {
      console.error(error);
      showToast("Unable to delete investment from cloud.", "error");
      updateCloudSyncStatus("Investment cloud delete failed.");
      return;
    }

    updateCloudSyncStatus("Investment item deleted from cloud.");
  }

  async function replaceCloudRowsSilently(tableName, rows, label) {
    if (!supabaseClient || !currentCloudUser) return false;

    updateCloudSyncStatus(`Uploading ${label}...`);

    const { error: deleteError } = await supabaseClient
      .from(tableName)
      .delete()
      .eq("user_id", currentCloudUser.id);

    if (deleteError) {
      console.error(deleteError);
      updateCloudSyncStatus(`${label} upload failed.`);
      return false;
    }

    if (!rows || rows.length === 0) {
      updateCloudSyncStatus(`${label} cleared from cloud.`);
      return true;
    }

    const { error: insertError } = await supabaseClient
      .from(tableName)
      .insert(rows);

    if (insertError) {
      console.error(insertError);
      updateCloudSyncStatus(`${label} upload failed.`);
      return false;
    }

    updateCloudSyncStatus(`${label} uploaded.`);
    return true;
  }

  function getAllCloudUploadGroups() {
    return [
      {
        tableName: "transactions",
        label: "Transactions",
        rows: transactions.map(mapLocalTransactionToCloudRow),
      },
      {
        tableName: "budgets",
        label: "Budgets",
        rows: getBudgetCloudRows(),
      },
      {
        tableName: "saving_goals",
        label: "Saving Goals",
        rows: savingGoals.map(mapLocalSavingGoalToCloudRow),
      },
      {
        tableName: "subscriptions",
        label: "Subscriptions",
        rows: subscriptions.map(mapLocalSubscriptionToCloudRow),
      },
      {
        tableName: "settings_items",
        label: "Settings",
        rows: getSettingsCloudRows(),
      },
      {
        tableName: "net_worth_items",
        label: "Net Worth",
        rows: netWorthItems.map(mapLocalNetWorthItemToCloudRow),
      },
      {
        tableName: "investment_items",
        label: "Investments",
        rows: investments.map(mapLocalInvestmentToCloudRow),
      },
    ];
  }

  async function uploadAllDataToCloud() {
    if (!canUseCloudSync()) return;

    const confirmed = confirm(
      "Upload all local data to cloud?\n\nThis will replace all existing cloud data for this account.",
    );

    if (!confirmed) return;

    const uploadGroups = getAllCloudUploadGroups();

    for (const group of uploadGroups) {
      const success = await replaceCloudRowsSilently(
        group.tableName,
        group.rows,
        group.label,
      );

      if (!success) {
        showToast(`${group.label} upload failed. Upload All stopped.`, "error");
        return;
      }
    }

    showToast("All local data uploaded to cloud successfully.", "success");
    updateCloudSyncStatus("All data uploaded to cloud successfully.");
  }

  async function loadCloudRows(tableName) {
    const { data, error } = await supabaseClient.from(tableName).select("*");

    if (error) {
      console.error(error);
      return {
        data: [],
        error,
      };
    }

    return {
      data: data || [],
      error: null,
    };
  }

  function renderAllAppData() {
    syncMonthSelectors();
    populateTransactionDropdowns({
      preserveCategory: false,
      preserveAccount: false,
    });

    renderSettings();
    renderTransactions();
    renderMonthlySnapshot();
    renderBudgetPlanner();
    renderSavingGoals();
    renderSubscriptions();
    renderNetWorthTracking();
    renderInvestmentTracking();
    renderDashboard();
    renderAnalytics();
  }

  async function loadAllDataFromCloud() {
    if (!canUseCloudSync()) return;

    const confirmed = confirm(
      "Load all data from cloud?\n\nThis will replace all current local data on this device.",
    );

    if (!confirmed) return;

    updateCloudSyncStatus("Loading all data from cloud...");

    const [
      cloudTransactions,
      cloudBudgets,
      cloudSavingGoals,
      cloudSubscriptions,
      cloudSettings,
      cloudNetWorth,
      cloudInvestments,
    ] = await Promise.all([
      loadCloudRows("transactions"),
      loadCloudRows("budgets"),
      loadCloudRows("saving_goals"),
      loadCloudRows("subscriptions"),
      loadCloudRows("settings_items"),
      loadCloudRows("net_worth_items"),
      loadCloudRows("investment_items"),
    ]);

    const failedLoad = [
      cloudTransactions,
      cloudBudgets,
      cloudSavingGoals,
      cloudSubscriptions,
      cloudSettings,
      cloudNetWorth,
      cloudInvestments,
    ].find((result) => result.error);

    if (failedLoad) {
      showToast("Unable to load all data from cloud.", "error");
      updateCloudSyncStatus("Load All failed.");
      return;
    }

    transactions = cloudTransactions.data.map(mapCloudRowToLocalTransaction);
    budgets = mapCloudRowsToBudgets(cloudBudgets.data);
    savingGoals = cloudSavingGoals.data.map(mapCloudRowToLocalSavingGoal);
    subscriptions = cloudSubscriptions.data.map(mapCloudRowToLocalSubscription);
    settings = mapCloudRowsToSettings(cloudSettings.data);
    netWorthItems = cloudNetWorth.data.map(mapCloudRowToLocalNetWorthItem);
    investments = cloudInvestments.data.map(mapCloudRowToLocalInvestment);

    saveTransactions();
    saveBudgets();
    saveSavingGoals();
    saveSubscriptions();
    saveSettings();
    saveNetWorthItems();
    saveInvestments();

    renderAllAppData();

    showToast("All cloud data loaded successfully.", "success");
    updateCloudSyncStatus("All cloud data loaded successfully.");
  }

  function setupCloudAuthListener() {
    if (!supabaseClient) {
      updateCloudAuthUI();
      return;
    }

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      currentCloudUser = session ? session.user : null;
      updateCloudAuthUI();
    });
  }

  async function initializeCloudAuth() {
    setupCloudAuthListener();
    await handleCloudAuthCallback();
    await loadCloudSession();
  }

  function renderTableEmptyState(tableBody, colspan, title, message) {
    if (!tableBody) return;

    tableBody.innerHTML = `
    <tr class="table-empty-row">
      <td colspan="${colspan}">
        <div class="table-empty-content">
          <strong>${title}</strong>
          <span>${message}</span>
        </div>
      </td>
    </tr>
  `;
  }

  function clearFormError(formElement) {
    if (!formElement) return;

    const existingError = formElement.querySelector(".form-error-message");

    if (existingError) {
      existingError.remove();
    }

    formElement.querySelectorAll(".input-error").forEach((input) => {
      input.classList.remove("input-error");
    });
  }

  function loadSelectedMonth() {
    return (
      localStorage.getItem(SELECTED_MONTH_STORAGE_KEY) ||
      getCurrentMonthString()
    );
  }

  function loadPlanningMonths() {
    const savedMonths = localStorage.getItem(PLANNING_MONTHS_STORAGE_KEY);

    if (savedMonths) {
      try {
        const parsedMonths = JSON.parse(savedMonths);

        if (Array.isArray(parsedMonths)) {
          return parsedMonths;
        }
      } catch (error) {
        console.error(error);
      }
    }

    return [getCurrentMonthString()];
  }

  function savePlanningMonths() {
    localStorage.setItem(
      PLANNING_MONTHS_STORAGE_KEY,
      JSON.stringify(planningMonths),
    );
  }

  function isValidMonthFormat(month) {
    return /^\d{4}-\d{2}$/.test(month);
  }

  function addPlanningMonth() {
    const newMonth = prompt(
      "Enter a month in YYYY-MM format:",
      getSelectedMonth(),
    );

    if (newMonth === null) return;

    const trimmedMonth = newMonth.trim();

    if (!isValidMonthFormat(trimmedMonth)) {
      showToast(
        "Please enter a valid month format, for example 2026-06.",
        "error",
      );
      return;
    }

    const monthNumber = Number(trimmedMonth.slice(5, 7));

    if (monthNumber < 1 || monthNumber > 12) {
      showToast("Month must be between 01 and 12.", "error");
      return;
    }

    if (getAvailableMonths().includes(trimmedMonth)) {
      setSelectedMonth(trimmedMonth);
      showToast(`Month ${trimmedMonth} already exists.`, "info");
      return;
    }

    planningMonths.push(trimmedMonth);
    planningMonths = Array.from(new Set(planningMonths)).sort().reverse();

    savePlanningMonths();
    setSelectedMonth(trimmedMonth);

    showToast(`Month ${trimmedMonth} added successfully.`, "success");
  }

  function saveSelectedMonth(month) {
    localStorage.setItem(SELECTED_MONTH_STORAGE_KEY, month);
  }

  function getSelectedMonth() {
    const months = getAvailableMonths();

    if (months.includes(selectedMonth)) {
      return selectedMonth;
    }

    if (months.length > 0) {
      selectedMonth = months[0];
      saveSelectedMonth(selectedMonth);
      return selectedMonth;
    }

    selectedMonth = selectedMonth || getCurrentMonthString();
    saveSelectedMonth(selectedMonth);

    return selectedMonth;
  }

  function populateMonthSelect(selectElement) {
    if (!selectElement) return;

    const months = getAvailableMonths();
    const currentSelectedMonth = getSelectedMonth();

    selectElement.innerHTML = "";

    if (months.length === 0) {
      const option = document.createElement("option");
      option.value = currentSelectedMonth;
      option.textContent = currentSelectedMonth;
      selectElement.appendChild(option);
      selectElement.value = currentSelectedMonth;
      return;
    }

    months.forEach((month) => {
      const option = document.createElement("option");
      option.value = month;
      option.textContent = month;
      selectElement.appendChild(option);
    });

    selectElement.value = currentSelectedMonth;
  }

  function syncMonthSelectors() {
    populateMonthSelect(document.getElementById("globalSelectedMonth"));
    populateMonthSelect(document.getElementById("monthlySnapshotMonth"));
    populateMonthSelect(document.getElementById("budgetPlannerMonth"));
  }

  function setSelectedMonth(month) {
    if (!month) return;

    selectedMonth = month;
    saveSelectedMonth(selectedMonth);

    syncMonthSelectors();
    renderDashboard();
    renderMonthlySnapshot();
    renderBudgetPlanner();
  }

  function showFormError(formElement, message, inputElement) {
    if (!formElement) return;

    clearFormError(formElement);

    const errorMessage = document.createElement("div");
    errorMessage.className = "form-error-message";
    errorMessage.textContent = message;

    formElement.prepend(errorMessage);

    if (inputElement) {
      inputElement.classList.add("input-error");
      inputElement.focus();
    }
  }

  function getTrimmedInputValue(inputElement) {
    if (!inputElement) return "";
    return inputElement.value.trim();
  }

  function getSavedTheme() {
    return localStorage.getItem(THEME_STORAGE_KEY) || "light";
  }

  function updateThemeButton(theme) {
    const themeToggleBtn = document.getElementById("themeToggleBtn");

    if (!themeToggleBtn) return;

    if (theme === "dark") {
      themeToggleBtn.innerHTML = `
      <i data-lucide="sun"></i>
      <span id="themeToggleText">Light Mode</span>
    `;
    } else {
      themeToggleBtn.innerHTML = `
      <i data-lucide="moon"></i>
      <span id="themeToggleText">Dark Mode</span>
    `;
    }

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  function applyTheme(theme) {
    document.body.classList.toggle("dark-mode", theme === "dark");
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    updateThemeButton(theme);
  }

  function toggleTheme() {
    const isDarkMode = document.body.classList.contains("dark-mode");
    const nextTheme = isDarkMode ? "light" : "dark";

    applyTheme(nextTheme);
  }

  function formatHKD(amount) {
    return `HK$${Number(amount).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  function getTransactionMonth(dateString) {
    if (!dateString) return "";
    return dateString.slice(0, 7);
  }

  function getBadgeClass(value) {
    return String(value).toLowerCase().replace(/\s+/g, "-");
  }

  // =========================
  // LOCAL STORAGE
  // =========================

  function loadTransactions() {
    const savedData = localStorage.getItem(STORAGE_KEY);

    if (savedData) {
      return JSON.parse(savedData).map((transaction) => ({
        ...transaction,
        id: transaction.id || createId(),
      }));
    }

    return defaultTransactions;
  }

  function saveTransactions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function isMonthlyBudgetData(value) {
    if (!isPlainObject(value)) return false;

    return Object.values(value).some((item) => {
      return isPlainObject(item);
    });
  }

  function normalizeBudgets(value) {
    if (isMonthlyBudgetData(value)) {
      return value;
    }

    if (isPlainObject(value)) {
      return {
        [getCurrentMonthString()]: {
          ...value,
        },
      };
    }

    return {
      [getCurrentMonthString()]: {},
    };
  }

  function getBudgetForMonth(month) {
    if (!isPlainObject(budgets)) {
      budgets = normalizeBudgets(defaultBudgets);
    }

    if (!isPlainObject(budgets[month])) {
      budgets[month] = {};
    }

    return budgets[month];
  }

  function getPreviousMonth(month) {
    const [year, monthNumber] = month.split("-").map(Number);
    const previousMonthDate = new Date(year, monthNumber - 2, 1);

    const previousYear = previousMonthDate.getFullYear();
    const previousMonthNumber = padTwoDigits(previousMonthDate.getMonth() + 1);

    return `${previousYear}-${previousMonthNumber}`;
  }

  function loadBudgets() {
    const savedBudgets = localStorage.getItem(BUDGET_STORAGE_KEY);

    if (savedBudgets) {
      return normalizeBudgets(JSON.parse(savedBudgets));
    }

    return normalizeBudgets(defaultBudgets);
  }

  function saveBudgets() {
    localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(budgets));
  }

  function loadSavingGoals() {
    const savedGoals = localStorage.getItem(GOALS_STORAGE_KEY);

    if (savedGoals) {
      return JSON.parse(savedGoals).map((goal) => ({
        ...goal,
        id: goal.id || createId(),
      }));
    }

    return defaultSavingGoals;
  }

  function saveSavingGoals() {
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(savingGoals));
  }

  function loadSubscriptions() {
    const savedSubscriptions = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);

    if (savedSubscriptions) {
      return JSON.parse(savedSubscriptions).map((subscription) => ({
        ...subscription,
        id: subscription.id || createId(),
      }));
    }

    return defaultSubscriptions;
  }

  function saveSubscriptions() {
    localStorage.setItem(
      SUBSCRIPTION_STORAGE_KEY,
      JSON.stringify(subscriptions),
    );
  }

  function loadSettings() {
    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);

      return {
        categories: (parsedSettings.categories || []).map((category) => ({
          ...category,
          id: category.id || createId(),
        })),

        accounts: (parsedSettings.accounts || []).map((account) => ({
          ...account,
          id: account.id || createId(),
        })),
      };
    }

    return defaultSettings;
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }

  function loadNetWorthItems() {
    const savedItems = localStorage.getItem(NET_WORTH_STORAGE_KEY);

    if (savedItems) {
      return JSON.parse(savedItems).map((item) => ({
        ...item,
        id: item.id || createId(),
      }));
    }

    return defaultNetWorthItems;
  }

  function saveNetWorthItems() {
    localStorage.setItem(NET_WORTH_STORAGE_KEY, JSON.stringify(netWorthItems));
  }

  function loadInvestments() {
    const savedInvestments = localStorage.getItem(INVESTMENT_STORAGE_KEY);

    if (savedInvestments) {
      return JSON.parse(savedInvestments).map((investment) => ({
        ...investment,
        id: investment.id || createId(),
      }));
    }

    return defaultInvestments;
  }

  function saveInvestments() {
    localStorage.setItem(INVESTMENT_STORAGE_KEY, JSON.stringify(investments));
  }

  // =========================
  // PAGE SWITCHING
  // =========================

  function updateCurrentPageLabel(targetId) {
    const currentPageLabel = document.getElementById("currentPageLabel");
    const pageTitle = pageTitleMap[targetId] || "Dashboard";

    if (currentPageLabel) {
      currentPageLabel.textContent = pageTitle;
    }

    document.title = `${pageTitle} | Permission to Save`;
  }

  function updateMobileMenuButton() {
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");

    if (!mobileMenuBtn || !sidebarPanel) return;

    const isOpen = sidebarPanel.classList.contains("mobile-open");

    mobileMenuBtn.innerHTML = isOpen
      ? `<i data-lucide="x"></i><span>Close Menu</span>`
      : `<i data-lucide="menu"></i><span>Menu</span>`;

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  function toggleMobileMenu() {
    if (!sidebarPanel) return;

    sidebarPanel.classList.toggle("mobile-open");
    updateMobileMenuButton();
  }

  function closeMobileMenu() {
    if (!sidebarPanel) return;

    sidebarPanel.classList.remove("mobile-open");
    updateMobileMenuButton();
  }

  function showPage(targetId) {
    const targetSection = document.getElementById(targetId);

    if (!targetSection) {
      console.warn(`找不到 id="${targetId}" 的頁面 section`);
      return;
    }

    navItems.forEach((item) => {
      item.classList.toggle("active", item.dataset.target === targetId);
    });

    pageSections.forEach((section) => {
      section.classList.toggle("is-active", section.id === targetId);
    });

    updateCurrentPageLabel(targetId);
    closeMobileMenu();
  }

  navItems.forEach((item) => {
    item.addEventListener("click", (event) => {
      event.preventDefault();
      showPage(item.dataset.target);
    });
  });

  if (sidebarPanel) {
    sidebarPanel.addEventListener("click", (event) => {
      const clickedMenuItem = event.target.closest(".menu-item[data-target]");

      if (!clickedMenuItem) return;

      setTimeout(() => {
        closeMobileMenu();
      }, 0);
    });
  }

  // =========================
  // SETTINGS → TRANSACTION DROPDOWNS
  // =========================

  function getUniqueNames(items) {
    return Array.from(
      new Set(
        items
          .map((item) => item.name)
          .filter((name) => name && name.trim() !== ""),
      ),
    );
  }

  function getTransactionCategoriesByType(transactionType) {
    if (!settings || !settings.categories) return [];

    if (transactionType === "Income") {
      return settings.categories.filter(
        (category) => category.type === "Income",
      );
    }

    if (transactionType === "Expense") {
      return settings.categories.filter((category) => {
        return category.type === "Expense" || category.type === "Investment";
      });
    }

    return settings.categories;
  }

  function populateSelectOptions(selectElement, options, selectedValue) {
    if (!selectElement) return;

    selectElement.innerHTML = "";

    options.forEach((optionValue) => {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = optionValue;
      selectElement.appendChild(option);
    });

    if (selectedValue && options.includes(selectedValue)) {
      selectElement.value = selectedValue;
    } else if (options.length > 0) {
      selectElement.value = options[0];
    }
  }

  function populateTransactionDropdowns(options = {}) {
    const preserveCategory = options.preserveCategory !== false;
    const preserveAccount = options.preserveAccount !== false;

    const transactionTypeSelect = document.getElementById("transactionType");
    const transactionCategorySelect = document.getElementById(
      "transactionCategory",
    );
    const transactionAccountSelect =
      document.getElementById("transactionAccount");
    const categoryFilterSelect = document.getElementById("categoryFilter");

    const currentCategory = transactionCategorySelect
      ? transactionCategorySelect.value
      : "";
    const currentAccount = transactionAccountSelect
      ? transactionAccountSelect.value
      : "";
    const currentFilter = categoryFilterSelect
      ? categoryFilterSelect.value
      : "All Categories";

    const selectedType = transactionTypeSelect
      ? transactionTypeSelect.value
      : "Expense";

    const categoryOptions = getUniqueNames(
      getTransactionCategoriesByType(selectedType),
    );

    const allCategoryOptions = getUniqueNames(settings.categories || []);
    const accountOptions = getUniqueNames(settings.accounts || []);

    populateSelectOptions(
      transactionCategorySelect,
      categoryOptions,
      preserveCategory ? currentCategory : "",
    );

    populateSelectOptions(
      transactionAccountSelect,
      accountOptions,
      preserveAccount ? currentAccount : "",
    );

    if (categoryFilterSelect) {
      categoryFilterSelect.innerHTML = "";

      const allOption = document.createElement("option");
      allOption.value = "All Categories";
      allOption.textContent = "All Categories";
      categoryFilterSelect.appendChild(allOption);

      allCategoryOptions.forEach((categoryName) => {
        const option = document.createElement("option");
        option.value = categoryName;
        option.textContent = categoryName;
        categoryFilterSelect.appendChild(option);
      });

      if (
        currentFilter &&
        currentFilter !== "All Categories" &&
        allCategoryOptions.includes(currentFilter)
      ) {
        categoryFilterSelect.value = currentFilter;
      } else {
        categoryFilterSelect.value = "All Categories";
      }
    }
  }

  // =========================
  // TRANSACTIONS
  // =========================

  function validateTransactionForm() {
    const transactionForm = document.getElementById("transactionForm");

    const dateInput = document.getElementById("transactionDate");
    const typeInput = document.getElementById("transactionType");
    const descriptionInput = document.getElementById("transactionDescription");
    const categoryInput = document.getElementById("transactionCategory");
    const accountInput = document.getElementById("transactionAccount");
    const amountInput = document.getElementById("transactionAmount");
    const statusInput = document.getElementById("transactionStatus");

    clearFormError(transactionForm);

    const date = getTrimmedInputValue(dateInput);
    const type = getTrimmedInputValue(typeInput);
    const description = getTrimmedInputValue(descriptionInput);
    const category = getTrimmedInputValue(categoryInput);
    const account = getTrimmedInputValue(accountInput);
    const amount = Number(amountInput.value);
    const status = getTrimmedInputValue(statusInput);

    if (!date) {
      showFormError(
        transactionForm,
        "Please select a transaction date.",
        dateInput,
      );
      return null;
    }

    if (!type) {
      showFormError(
        transactionForm,
        "Please select a transaction type.",
        typeInput,
      );
      return null;
    }

    if (!description) {
      showFormError(
        transactionForm,
        "Please enter a description.",
        descriptionInput,
      );
      return null;
    }

    if (!category) {
      showFormError(
        transactionForm,
        "Please select a category.",
        categoryInput,
      );
      return null;
    }

    if (!account) {
      showFormError(transactionForm, "Please select an account.", accountInput);
      return null;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      showFormError(
        transactionForm,
        "Amount must be greater than 0.",
        amountInput,
      );
      return null;
    }

    if (!status) {
      showFormError(transactionForm, "Please select a status.", statusInput);
      return null;
    }

    return {
      date,
      type,
      description,
      category,
      account,
      amount,
      status,
    };
  }

  function renderTransactions() {
    const transactionTableBody = document.getElementById(
      "transactionTableBody",
    );
    if (!transactionTableBody) return;

    transactionTableBody.innerHTML = "";

    if (transactions.length === 0) {
      renderTableEmptyState(
        transactionTableBody,
        8,
        "No transactions yet.",
        "Add your first income or expense record to start tracking.",
      );

      updateTransactionSummary();
      populateTransactionMonthFilter();
      filterTransactions();
      renderMonthlySnapshot();
      renderBudgetPlanner();
      renderDashboard();
      renderAnalytics();

      return;
    }

    transactions.forEach((transaction) => {
      const typeTagClass =
        transaction.type === "Income" ? "green-tag" : "red-tag";
      const amountClass = transaction.type === "Income" ? "green" : "red";
      const statusDotClass =
        transaction.status === "Completed" ? "green-dot" : "blue-dot";

      const row = document.createElement("tr");

      row.dataset.id = transaction.id;
      row.dataset.type = transaction.type;
      row.dataset.category = transaction.category;
      row.dataset.status = transaction.status;
      row.dataset.amount = transaction.amount;

      row.innerHTML = `
        <td>${transaction.date}</td>
        <td>${transaction.description}</td>
        <td><span class="tag ${typeTagClass}">${transaction.type}</span></td>
        <td>${transaction.category}</td>
        <td>${transaction.account}</td>
        <td class="${amountClass}">${formatHKD(transaction.amount)}</td>
        <td><span class="status ${statusDotClass}"></span>${transaction.status}</td>
        <td>
          <div class="action-buttons">
            <button class="edit-transaction-btn" data-id="${transaction.id}" type="button" aria-label="Edit transaction">
              <i data-lucide="pencil"></i>
            </button>

            <button class="delete-transaction-btn" data-id="${transaction.id}" type="button" aria-label="Delete transaction">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      `;

      transactionTableBody.appendChild(row);
    });

    updateTransactionSummary();
    populateTransactionMonthFilter();
    filterTransactions();
    renderMonthlySnapshot();
    renderBudgetPlanner();
    renderDashboard();
    renderAnalytics();

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  function updateTransactionSummary() {
    const summaryIncome = document.getElementById("summaryIncome");
    const summaryExpense = document.getElementById("summaryExpense");
    const summaryCompleted = document.getElementById("summaryCompleted");
    const summaryPending = document.getElementById("summaryPending");

    if (
      !summaryIncome ||
      !summaryExpense ||
      !summaryCompleted ||
      !summaryPending
    )
      return;

    let totalIncome = 0;
    let totalExpense = 0;
    let completedCount = 0;
    let pendingCount = 0;

    transactions.forEach((transaction) => {
      if (transaction.type === "Income") {
        totalIncome += Number(transaction.amount);
      }

      if (transaction.type === "Expense") {
        totalExpense += Number(transaction.amount);
      }

      if (transaction.status === "Completed") {
        completedCount += 1;
      }

      if (transaction.status === "Pending") {
        pendingCount += 1;
      }
    });

    summaryIncome.textContent = formatHKD(totalIncome);
    summaryExpense.textContent = formatHKD(totalExpense);
    summaryCompleted.textContent = completedCount;
    summaryPending.textContent = pendingCount;
  }

  function populateTransactionMonthFilter() {
    const monthFilter = document.getElementById("monthFilter");

    if (!monthFilter) return;

    const currentValue = monthFilter.value || "All Months";
    const months = getAvailableMonths();

    monthFilter.innerHTML = "";

    const allOption = document.createElement("option");
    allOption.value = "All Months";
    allOption.textContent = "All Months";
    monthFilter.appendChild(allOption);

    months.forEach((month) => {
      const option = document.createElement("option");
      option.value = month;
      option.textContent = month;
      monthFilter.appendChild(option);
    });

    if (currentValue && months.includes(currentValue)) {
      monthFilter.value = currentValue;
    } else {
      monthFilter.value = "All Months";
    }
  }

  function filterTransactions() {
    const transactionSearch = document.getElementById("transactionSearch");
    const categoryFilter = document.getElementById("categoryFilter");
    const typeFilter = document.getElementById("typeFilter");
    const statusFilter = document.getElementById("statusFilter");
    const monthFilter = document.getElementById("monthFilter");
    const transactionFilterCount = document.getElementById(
      "transactionFilterCount",
    );
    const transactionTableBody = document.getElementById(
      "transactionTableBody",
    );

    if (!transactionTableBody) return;

    const keyword = transactionSearch
      ? transactionSearch.value.toLowerCase().trim()
      : "";

    const selectedCategory = categoryFilter
      ? categoryFilter.value
      : "All Categories";

    const selectedType = typeFilter ? typeFilter.value : "All Types";
    const selectedStatus = statusFilter ? statusFilter.value : "All Statuses";
    const selectedMonth = monthFilter ? monthFilter.value : "All Months";

    const rows = Array.from(
      transactionTableBody.querySelectorAll("tr[data-id]"),
    );

    let visibleCount = 0;

    rows.forEach((row) => {
      const rowText = row.textContent.toLowerCase();
      const rowCategory = row.dataset.category;
      const rowType = row.dataset.type;
      const rowStatus = row.dataset.status;
      const rowDate = row.children[0] ? row.children[0].textContent.trim() : "";
      const rowMonth = rowDate.slice(0, 7);

      const matchesKeyword = rowText.includes(keyword);

      const matchesCategory =
        selectedCategory === "All Categories" ||
        rowCategory === selectedCategory;

      const matchesType =
        selectedType === "All Types" || rowType === selectedType;

      const matchesStatus =
        selectedStatus === "All Statuses" || rowStatus === selectedStatus;

      const matchesMonth =
        selectedMonth === "All Months" || rowMonth === selectedMonth;

      const shouldShow =
        matchesKeyword &&
        matchesCategory &&
        matchesType &&
        matchesStatus &&
        matchesMonth;

      row.style.display = shouldShow ? "" : "none";

      if (shouldShow) {
        visibleCount += 1;
      }
    });

    if (transactionFilterCount) {
      const totalCount = rows.length;

      if (totalCount === 0) {
        transactionFilterCount.textContent = "No transactions yet";
      } else {
        transactionFilterCount.textContent = `Showing ${visibleCount} of ${totalCount} transaction${
          totalCount === 1 ? "" : "s"
        }`;
      }
    }
  }

  function setModalMode(mode) {
    const transactionModalTitle = document.getElementById(
      "transactionModalTitle",
    );
    const transactionModalText = document.getElementById(
      "transactionModalText",
    );
    const transactionSubmitBtn = document.getElementById(
      "transactionSubmitBtn",
    );

    if (mode === "edit") {
      if (transactionModalTitle)
        transactionModalTitle.textContent = "Edit Transaction";
      if (transactionModalText)
        transactionModalText.textContent =
          "Update this income or expense record.";
      if (transactionSubmitBtn)
        transactionSubmitBtn.textContent = "Update Transaction";
    } else {
      if (transactionModalTitle)
        transactionModalTitle.textContent = "Add Transaction";
      if (transactionModalText)
        transactionModalText.textContent =
          "Create a new income or expense record.";
      if (transactionSubmitBtn)
        transactionSubmitBtn.textContent = "Save Transaction";
    }
  }

  function openTransactionModal() {
    const transactionModal = document.getElementById("transactionModal");
    const transactionForm = document.getElementById("transactionForm");
    const transactionTypeSelect = document.getElementById("transactionType");

    if (!transactionModal || !transactionForm) return;

    editingTransactionId = null;
    setModalMode("add");
    transactionForm.reset();

    if (transactionTypeSelect) {
      transactionTypeSelect.value = "Expense";
    }

    populateTransactionDropdowns({
      preserveCategory: false,
      preserveAccount: false,
    });

    const dateInput = document.getElementById("transactionDate");
    if (dateInput) {
      dateInput.value = getDefaultDateForSelectedMonth();
    }

    transactionModal.classList.add("is-open");
  }

  function openEditTransactionModal(transactionId) {
    const transaction = transactions.find((item) => item.id === transactionId);
    const transactionModal = document.getElementById("transactionModal");

    if (!transaction || !transactionModal) return;

    editingTransactionId = transactionId;
    setModalMode("edit");

    document.getElementById("transactionDate").value = transaction.date;
    document.getElementById("transactionType").value = transaction.type;

    populateTransactionDropdowns({
      preserveCategory: false,
      preserveAccount: false,
    });

    document.getElementById("transactionDescription").value =
      transaction.description;
    document.getElementById("transactionCategory").value = transaction.category;
    document.getElementById("transactionAccount").value = transaction.account;
    document.getElementById("transactionAmount").value = transaction.amount;
    document.getElementById("transactionStatus").value = transaction.status;

    transactionModal.classList.add("is-open");
  }

  function closeTransactionModal() {
    const transactionModal = document.getElementById("transactionModal");
    const transactionForm = document.getElementById("transactionForm");

    if (transactionModal) {
      transactionModal.classList.remove("is-open");
    }

    if (transactionForm) {
      clearFormError(transactionForm);
      transactionForm.reset();
    }

    editingTransactionId = null;
    setModalMode("add");
  }

  function deleteTransaction(transactionId) {
    const confirmed = confirm(
      "Are you sure you want to delete this transaction?",
    );

    if (!confirmed) return;

    transactions = transactions.filter((transaction) => {
      return transaction.id !== transactionId;
    });

    saveTransactions();
    renderTransactions();

    showToast("Transaction deleted successfully.", "success");

    deleteTransactionFromCloud(transactionId);
  }

  // =========================
  // MONTHLY SNAPSHOT
  // =========================

  function getAvailableMonths() {
    const monthSet = new Set();

    planningMonths.forEach((month) => {
      if (month) {
        monthSet.add(month);
      }
    });

    transactions.forEach((transaction) => {
      if (transaction.date) {
        monthSet.add(getTransactionMonth(transaction.date));
      }
    });

    if (isPlainObject(budgets)) {
      Object.keys(budgets).forEach((month) => {
        if (isValidMonthFormat(month)) {
          monthSet.add(month);
        }
      });
    }

    if (selectedMonth) {
      monthSet.add(selectedMonth);
    }

    return Array.from(monthSet).sort().reverse();
  }

  function calculateMonthlySnapshot(month) {
    let income = 0;
    let expense = 0;
    let investment = 0;

    transactions.forEach((transaction) => {
      const transactionMonth = getTransactionMonth(transaction.date);

      if (transactionMonth !== month) return;
      if (transaction.status !== "Completed") return;

      const amount = Number(transaction.amount);

      if (transaction.type === "Income") {
        income += amount;
      }

      if (
        transaction.type === "Expense" &&
        transaction.category !== "Investment"
      ) {
        expense += amount;
      }

      if (
        transaction.type === "Expense" &&
        transaction.category === "Investment"
      ) {
        investment += amount;
      }
    });

    const saving = income - expense - investment;
    const netCashFlow = saving;
    const savingRate = income > 0 ? (saving / income) * 100 : 0;

    return {
      month,
      income,
      expense,
      investment,
      saving,
      netCashFlow,
      savingRate,
    };
  }

  function populateMonthlySnapshotOptions() {
    const monthSelect = document.getElementById("monthlySnapshotMonth");
    populateMonthSelect(monthSelect);
  }

  function renderMonthlySnapshotCards(snapshot) {
    const snapshotIncome = document.getElementById("snapshotIncome");
    const snapshotExpense = document.getElementById("snapshotExpense");
    const snapshotInvestment = document.getElementById("snapshotInvestment");
    const snapshotSaving = document.getElementById("snapshotSaving");
    const snapshotNetCashFlow = document.getElementById("snapshotNetCashFlow");
    const snapshotSavingRate = document.getElementById("snapshotSavingRate");

    if (
      !snapshotIncome ||
      !snapshotExpense ||
      !snapshotInvestment ||
      !snapshotSaving ||
      !snapshotNetCashFlow ||
      !snapshotSavingRate
    ) {
      return;
    }

    snapshotIncome.textContent = formatHKD(snapshot.income);
    snapshotExpense.textContent = formatHKD(snapshot.expense);
    snapshotInvestment.textContent = formatHKD(snapshot.investment);
    snapshotSaving.textContent = formatHKD(snapshot.saving);
    snapshotNetCashFlow.textContent = formatHKD(snapshot.netCashFlow);
    snapshotSavingRate.textContent = `${snapshot.savingRate.toFixed(1)}%`;

    snapshotSaving.classList.toggle("red", snapshot.saving < 0);
    snapshotSaving.classList.toggle("green", snapshot.saving >= 0);

    snapshotNetCashFlow.classList.toggle("red", snapshot.netCashFlow < 0);
    snapshotNetCashFlow.classList.toggle("purple", snapshot.netCashFlow >= 0);
  }

  function renderMonthlySnapshotTable() {
    const tableBody = document.getElementById("monthlySnapshotTableBody");
    if (!tableBody) return;

    const months = getAvailableMonths();
    tableBody.innerHTML = "";

    months.forEach((month) => {
      const snapshot = calculateMonthlySnapshot(month);
      const savingClass = snapshot.saving >= 0 ? "green" : "red";
      const cashFlowClass = snapshot.netCashFlow >= 0 ? "purple" : "red";

      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${snapshot.month}</td>
        <td class="green">${formatHKD(snapshot.income)}</td>
        <td class="red">${formatHKD(snapshot.expense)}</td>
        <td class="blue">${formatHKD(snapshot.investment)}</td>
        <td class="${savingClass}">${formatHKD(snapshot.saving)}</td>
        <td class="${cashFlowClass}">${formatHKD(snapshot.netCashFlow)}</td>
        <td>${snapshot.savingRate.toFixed(1)}%</td>
      `;

      tableBody.appendChild(row);
    });
  }

  function renderMonthlySnapshot() {
    const monthSelect = document.getElementById("monthlySnapshotMonth");
    if (!monthSelect) return;

    populateMonthlySnapshotOptions();

    const currentSelectedMonth = getSelectedMonth();
    monthSelect.value = currentSelectedMonth;

    const snapshot = calculateMonthlySnapshot(currentSelectedMonth);

    renderMonthlySnapshotCards(snapshot);
    renderMonthlySnapshotTable();
  }

  function getComparisonPercent(currentValue, previousValue) {
    if (previousValue === 0) {
      return currentValue > 0 ? 100 : 0;
    }

    return ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
  }

  function updateDashboardComparison(
    elementId,
    currentValue,
    previousValue,
    options = {},
  ) {
    const element = document.getElementById(elementId);

    if (!element) return;

    const difference = currentValue - previousValue;
    const lowerIsBetter = Boolean(options.lowerIsBetter);
    const isPointChange = Boolean(options.isPointChange);

    element.classList.remove(
      "comparison-up",
      "comparison-down",
      "comparison-neutral",
    );

    if (currentValue === 0 && previousValue === 0) {
      element.textContent = "No change vs last month";
      element.classList.add("comparison-neutral");
      return;
    }

    if (previousValue === 0 && currentValue !== 0 && !isPointChange) {
      element.textContent = "New this month";
      element.classList.add(
        lowerIsBetter ? "comparison-down" : "comparison-up",
      );
      return;
    }

    const arrow = difference >= 0 ? "↑" : "↓";

    let displayText = "";

    if (isPointChange) {
      displayText = `${arrow} ${Math.abs(difference).toFixed(1)} pp vs last month`;
    } else {
      const percent = getComparisonPercent(currentValue, previousValue);
      displayText = `${arrow} ${Math.abs(percent).toFixed(1)}% vs last month`;
    }

    const isImproved = lowerIsBetter ? difference < 0 : difference > 0;
    const isWorse = lowerIsBetter ? difference > 0 : difference < 0;

    element.textContent = displayText;

    if (isImproved) {
      element.classList.add("comparison-up");
    } else if (isWorse) {
      element.classList.add("comparison-down");
    } else {
      element.classList.add("comparison-neutral");
    }
  }

  function renderDashboardComparisons(currentSnapshot, previousSnapshot) {
    updateDashboardComparison(
      "dashboardIncomeCompare",
      currentSnapshot.income,
      previousSnapshot.income,
    );

    updateDashboardComparison(
      "dashboardExpenseCompare",
      currentSnapshot.expense,
      previousSnapshot.expense,
      {
        lowerIsBetter: true,
      },
    );

    updateDashboardComparison(
      "dashboardSavingCompare",
      currentSnapshot.saving,
      previousSnapshot.saving,
    );

    updateDashboardComparison(
      "dashboardInvestmentCompare",
      currentSnapshot.investment,
      previousSnapshot.investment,
    );

    updateDashboardComparison(
      "dashboardNetCashFlowCompare",
      currentSnapshot.netCashFlow,
      previousSnapshot.netCashFlow,
    );

    updateDashboardComparison(
      "dashboardSavingRateCompare",
      currentSnapshot.savingRate,
      previousSnapshot.savingRate,
      {
        isPointChange: true,
      },
    );
  }

  function renderDashboard() {
    const dashboardMonth = getSelectedMonth();
    const previousMonth = getPreviousMonth(dashboardMonth);

    const snapshot = calculateMonthlySnapshot(dashboardMonth);
    const previousSnapshot = calculateMonthlySnapshot(previousMonth);

    syncMonthSelectors();

    const thisMonthLabel = document.getElementById("thisMonthLabel");
    const thisMonthIncome = document.getElementById("thisMonthIncome");
    const thisMonthExpense = document.getElementById("thisMonthExpense");
    const thisMonthSaving = document.getElementById("thisMonthSaving");
    const thisMonthInvestment = document.getElementById("thisMonthInvestment");
    const thisMonthNetCashFlow = document.getElementById(
      "thisMonthNetCashFlow",
    );

    const dashboardIncome = document.getElementById("dashboardIncome");
    const dashboardExpense = document.getElementById("dashboardExpense");
    const dashboardSaving = document.getElementById("dashboardSaving");
    const dashboardInvestment = document.getElementById("dashboardInvestment");
    const dashboardNetCashFlow = document.getElementById(
      "dashboardNetCashFlow",
    );
    const dashboardSavingRate = document.getElementById("dashboardSavingRate");

    if (thisMonthLabel) thisMonthLabel.textContent = dashboardMonth;

    if (thisMonthIncome)
      thisMonthIncome.textContent = formatHKD(snapshot.income);
    if (thisMonthExpense)
      thisMonthExpense.textContent = formatHKD(snapshot.expense);
    if (thisMonthSaving)
      thisMonthSaving.textContent = formatHKD(snapshot.saving);
    if (thisMonthInvestment)
      thisMonthInvestment.textContent = formatHKD(snapshot.investment);
    if (thisMonthNetCashFlow)
      thisMonthNetCashFlow.textContent = formatHKD(snapshot.netCashFlow);

    if (dashboardIncome)
      dashboardIncome.textContent = formatHKD(snapshot.income);
    if (dashboardExpense)
      dashboardExpense.textContent = formatHKD(snapshot.expense);
    if (dashboardSaving)
      dashboardSaving.textContent = formatHKD(snapshot.saving);
    if (dashboardInvestment)
      dashboardInvestment.textContent = formatHKD(snapshot.investment);
    if (dashboardNetCashFlow)
      dashboardNetCashFlow.textContent = formatHKD(snapshot.netCashFlow);
    if (dashboardSavingRate)
      dashboardSavingRate.textContent = `${snapshot.savingRate.toFixed(1)}%`;

    renderDashboardComparisons(snapshot, previousSnapshot);

    const savingElements = [thisMonthSaving, dashboardSaving];
    const cashFlowElements = [thisMonthNetCashFlow, dashboardNetCashFlow];

    savingElements.forEach((element) => {
      if (!element) return;

      element.classList.toggle("green", snapshot.saving >= 0);
      element.classList.toggle("red", snapshot.saving < 0);
    });

    cashFlowElements.forEach((element) => {
      if (!element) return;

      element.classList.toggle("purple", snapshot.netCashFlow >= 0);
      element.classList.toggle("red", snapshot.netCashFlow < 0);
    });

    renderDashboardRecentTransactions();
    renderMoneyFlowChart();
    renderTopSpendingCategories();
    renderDashboardSavingGoals();
    renderDashboardSubscriptions();
    renderDashboardNetWorthSummary();
    renderDashboardInvestmentSummary();
  }

  function renderDashboardRecentTransactions() {
    const tableBody = document.getElementById(
      "dashboardRecentTransactionsBody",
    );

    if (!tableBody) return;

    const latestTransactions = [...transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 4);

    tableBody.innerHTML = "";

    if (latestTransactions.length === 0) {
      renderTableEmptyState(
        tableBody,
        5,
        "No recent transactions.",
        "Your latest transactions will appear here.",
      );

      return;
    }

    latestTransactions.forEach((transaction) => {
      const statusDotClass =
        transaction.status === "Completed" ? "green-dot" : "blue-dot";

      let tagClass = "yellow-tag";

      if (transaction.type === "Income") {
        tagClass = "green-tag";
      } else if (transaction.category === "Transportation") {
        tagClass = "blue-tag";
      } else if (transaction.category === "Shopping") {
        tagClass = "red-tag";
      } else if (transaction.category === "Investment") {
        tagClass = "blue-tag";
      }

      const row = document.createElement("tr");

      row.dataset.dashboardTransactionId = transaction.id;
      row.setAttribute("role", "button");
      row.setAttribute("tabindex", "0");
      row.setAttribute("title", "View this transaction");

      row.innerHTML = `
      <td>${transaction.date}</td>
      <td>${transaction.description}</td>
      <td><span class="tag ${tagClass}">${transaction.category}</span></td>
      <td>${transaction.account}</td>
      <td><span class="status ${statusDotClass}"></span>${transaction.status}</td>
    `;

      tableBody.appendChild(row);
    });
  }

  function highlightTransactionRow(transactionId) {
    const transactionTableBody = document.getElementById(
      "transactionTableBody",
    );

    if (!transactionTableBody) return;

    const rows = Array.from(transactionTableBody.querySelectorAll("tr"));

    const targetRow = rows.find((row) => {
      return row.dataset.id === transactionId;
    });

    if (!targetRow) return;

    targetRow.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    targetRow.classList.add("transaction-highlight");

    setTimeout(() => {
      targetRow.classList.remove("transaction-highlight");
    }, 2600);
  }

  function goToTransactionFromDashboard(transactionId) {
    if (!transactionId) return;

    const transactionSearch = document.getElementById("transactionSearch");
    const categoryFilter = document.getElementById("categoryFilter");
    const typeFilter = document.getElementById("typeFilter");
    const statusFilter = document.getElementById("statusFilter");
    const monthFilter = document.getElementById("monthFilter");

    populateTransactionMonthFilter();

    if (transactionSearch) {
      transactionSearch.value = "";
    }

    if (categoryFilter) {
      categoryFilter.value = "All Categories";
    }

    if (typeFilter) {
      typeFilter.value = "All Types";
    }

    if (statusFilter) {
      statusFilter.value = "All Statuses";
    }

    if (monthFilter) {
      monthFilter.value = "All Months";
    }

    showPage("transactions");
    filterTransactions();

    setTimeout(() => {
      highlightTransactionRow(transactionId);
    }, 120);

    showToast("Showing selected transaction.", "info");
  }

  function getCompletedMoneyFlowTransactions() {
    return transactions.filter((transaction) => {
      return transaction.status === "Completed";
    });
  }

  function addTransactionToMoneyFlowBucket(bucket, transaction) {
    const amount = Number(transaction.amount);

    if (!Number.isFinite(amount)) return;

    if (transaction.type === "Income") {
      bucket.income += amount;
    }

    if (transaction.type === "Expense") {
      bucket.expense += amount;
    }
  }

  function getDailyMoneyFlowData() {
    const currentMonth = getSelectedMonth();
    const [year, month] = currentMonth.split("-").map(Number);

    const totalDays = new Date(year, month, 0).getDate();

    const dailyData = Array.from({ length: totalDays }, (_, index) => {
      const day = index + 1;
      const dateKey = `${currentMonth}-${String(day).padStart(2, "0")}`;

      return {
        key: dateKey,
        label: String(day),
        income: 0,
        expense: 0,
      };
    });

    const dailyMap = new Map();

    dailyData.forEach((item) => {
      dailyMap.set(item.key, item);
    });

    getCompletedMoneyFlowTransactions().forEach((transaction) => {
      if (!transaction.date) return;

      const transactionMonth = getTransactionMonth(transaction.date);

      if (transactionMonth !== currentMonth) return;

      const bucket = dailyMap.get(transaction.date);

      if (!bucket) return;

      addTransactionToMoneyFlowBucket(bucket, transaction);
    });

    return dailyData;
  }

  function getMonthlyMoneyFlowData() {
    const months = getAvailableMonths().sort();

    if (months.length === 0) {
      months.push(getSelectedMonth());
    }

    return months.map((month) => {
      const bucket = {
        key: month,
        label: month.slice(5),
        income: 0,
        expense: 0,
      };

      getCompletedMoneyFlowTransactions().forEach((transaction) => {
        if (getTransactionMonth(transaction.date) !== month) return;

        addTransactionToMoneyFlowBucket(bucket, transaction);
      });

      return bucket;
    });
  }

  function getYearlyMoneyFlowData() {
    const yearSet = new Set();

    getAvailableMonths().forEach((month) => {
      yearSet.add(month.slice(0, 4));
    });

    if (yearSet.size === 0) {
      yearSet.add(getSelectedMonth().slice(0, 4));
    }

    const years = Array.from(yearSet).sort();

    return years.map((year) => {
      const bucket = {
        key: year,
        label: year,
        income: 0,
        expense: 0,
      };

      getCompletedMoneyFlowTransactions().forEach((transaction) => {
        if (!transaction.date) return;

        const transactionYear = transaction.date.slice(0, 4);

        if (transactionYear !== year) return;

        addTransactionToMoneyFlowBucket(bucket, transaction);
      });

      return bucket;
    });
  }

  function getMoneyFlowData() {
    if (moneyFlowView === "daily") {
      return getDailyMoneyFlowData();
    }

    if (moneyFlowView === "yearly") {
      return getYearlyMoneyFlowData();
    }

    return getMonthlyMoneyFlowData();
  }

  function getNiceMoneyFlowMax(value) {
    if (!value || value <= 0) return 1000;

    const power = Math.pow(10, Math.floor(Math.log10(value)));
    return Math.ceil(value / power) * power;
  }

  function getBarHeight(value, maxValue) {
    if (!value || value <= 0) return 0;

    return Math.max((value / maxValue) * 100, 3);
  }

  function updateMoneyFlowButtons() {
    const segmented = document.getElementById("moneyFlowSegmented");

    if (!segmented) return;

    const buttons = segmented.querySelectorAll("button[data-flow-view]");

    buttons.forEach((button) => {
      button.classList.toggle(
        "selected",
        button.dataset.flowView === moneyFlowView,
      );
    });
  }

  function setMoneyFlowView(view) {
    if (!["daily", "monthly", "yearly"].includes(view)) return;

    moneyFlowView = view;
    updateMoneyFlowButtons();
    renderMoneyFlowChart();
  }

  function renderMoneyFlowChart() {
    const barsContainer = document.getElementById("moneyFlowBars");
    const yAxis = document.getElementById("moneyFlowYAxis");

    if (!barsContainer || !yAxis) return;

    const flowData = getMoneyFlowData();

    const maxAmount = Math.max(
      ...flowData.map((item) => item.income),
      ...flowData.map((item) => item.expense),
      0,
    );

    const niceMax = getNiceMoneyFlowMax(maxAmount);

    const ticks = [niceMax, niceMax * 0.75, niceMax * 0.5, niceMax * 0.25, 0];

    yAxis.innerHTML = ticks
      .map((tick) => `<span>${formatHKD(tick)}</span>`)
      .join("");

    barsContainer.innerHTML = "";

    barsContainer.style.gridTemplateColumns = `repeat(${flowData.length}, 1fr)`;

    if (moneyFlowView === "daily") {
      barsContainer.style.minWidth = `${Math.max(760, flowData.length * 42)}px`;
    } else if (moneyFlowView === "yearly") {
      barsContainer.style.minWidth = `${Math.max(520, flowData.length * 90)}px`;
    } else {
      barsContainer.style.minWidth = `${Math.max(680, flowData.length * 58)}px`;
    }

    flowData.forEach((item) => {
      const incomeHeight = getBarHeight(item.income, niceMax);
      const expenseHeight = getBarHeight(item.expense, niceMax);

      const barGroup = document.createElement("div");
      barGroup.className = "bar-group";

      barGroup.innerHTML = `
      <div
        class="bar income-bar"
        style="height: ${incomeHeight}%"
        title="Income: ${formatHKD(item.income)}"
      ></div>

      <div
        class="bar expense-bar"
        style="height: ${expenseHeight}%"
        title="Expense: ${formatHKD(item.expense)}"
      ></div>

      <span>${item.label}</span>
    `;

      barsContainer.appendChild(barGroup);
    });

    updateMoneyFlowButtons();
  }

  function calculateTopSpendingCategories(month) {
    const categoryMap = {};

    transactions.forEach((transaction) => {
      if (!transaction.date) return;
      if (transaction.status !== "Completed") return;
      if (transaction.type !== "Expense") return;
      if (transaction.category === "Investment") return;

      const transactionMonth = getTransactionMonth(transaction.date);

      if (transactionMonth !== month) return;

      const category = transaction.category || "Others";

      if (!categoryMap[category]) {
        categoryMap[category] = {
          category,
          amount: 0,
          count: 0,
        };
      }

      categoryMap[category].amount += Number(transaction.amount);
      categoryMap[category].count += 1;
    });

    return Object.values(categoryMap)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }

  function renderTopSpendingCategories() {
    const topSpendingList = document.getElementById("topSpendingList");

    if (!topSpendingList) return;

    const dashboardMonth = getSelectedMonth();

    const topCategories = calculateTopSpendingCategories(dashboardMonth);
    const totalSpending = topCategories.reduce((sum, item) => {
      return sum + item.amount;
    }, 0);

    topSpendingList.innerHTML = "";

    if (topCategories.length === 0) {
      topSpendingList.innerHTML = `
      <div class="top-spending-empty">
        No completed expense records for this month yet.
      </div>
    `;
      return;
    }

    topCategories.forEach((item, index) => {
      const percentage =
        totalSpending > 0 ? (item.amount / totalSpending) * 100 : 0;

      const usageWidth = Math.min(percentage, 100);

      const row = document.createElement("div");
      row.className = "top-spending-item";
      row.dataset.topSpendingCategory = item.category;
      row.setAttribute("role", "button");
      row.setAttribute("tabindex", "0");
      row.setAttribute("title", `View ${item.category} transactions`);

      row.innerHTML = `
      <div class="top-spending-rank">
        ${index + 1}
      </div>

      <div class="top-spending-main">
        <div class="top-spending-category-row">
          <strong>${item.category}</strong>
          <span class="red">${formatHKD(item.amount)}</span>
        </div>

        <div class="budget-usage-bar">
          <span style="width:${usageWidth}%"></span>
        </div>

        <div class="top-spending-meta">
          ${item.count} transaction${item.count > 1 ? "s" : ""} · ${percentage.toFixed(0)}% of top spending
        </div>
      </div>
    `;

      topSpendingList.appendChild(row);
    });
  }

  function goToTransactionsWithCategory(categoryName) {
    if (!categoryName) return;

    const transactionSearch = document.getElementById("transactionSearch");
    const categoryFilter = document.getElementById("categoryFilter");
    const typeFilter = document.getElementById("typeFilter");
    const statusFilter = document.getElementById("statusFilter");
    const monthFilter = document.getElementById("monthFilter");

    populateTransactionDropdowns();
    populateTransactionMonthFilter();

    if (transactionSearch) {
      transactionSearch.value = "";
    }

    if (categoryFilter) {
      const categoryExists = Array.from(categoryFilter.options).some(
        (option) => {
          return option.value === categoryName;
        },
      );

      if (!categoryExists) {
        const option = document.createElement("option");
        option.value = categoryName;
        option.textContent = categoryName;
        categoryFilter.appendChild(option);
      }

      categoryFilter.value = categoryName;
    }

    if (typeFilter) {
      typeFilter.value = "All Types";
    }

    if (statusFilter) {
      statusFilter.value = "All Statuses";
    }

    if (monthFilter) {
      const dashboardMonth = getSelectedMonth();

      const monthExists = Array.from(monthFilter.options).some((option) => {
        return option.value === dashboardMonth;
      });

      if (monthExists) {
        monthFilter.value = dashboardMonth;
      } else {
        monthFilter.value = "All Months";
      }
    }

    showPage("transactions");
    filterTransactions();

    showToast(`Showing transactions for ${categoryName}.`, "info");
  }

  function renderDashboardSavingGoals() {
    const dashboardSavingGoalsList = document.getElementById(
      "dashboardSavingGoalsList",
    );

    if (!dashboardSavingGoalsList) return;

    dashboardSavingGoalsList.innerHTML = "";

    if (!savingGoals || savingGoals.length === 0) {
      dashboardSavingGoalsList.innerHTML = `
      <div class="dashboard-goals-empty">
        No saving goals yet.
      </div>
    `;
      return;
    }

    const sortedGoals = [...savingGoals]
      .sort((a, b) => {
        const progressA = calculateGoalProgress(a.current, a.target);
        const progressB = calculateGoalProgress(b.current, b.target);

        return progressB - progressA;
      })
      .slice(0, 3);

    sortedGoals.forEach((goal) => {
      const progress = calculateGoalProgress(goal.current, goal.target);
      const remaining = Number(goal.target) - Number(goal.current);

      const goalItem = document.createElement("div");
      goalItem.className = "dashboard-goal-item";

      goalItem.innerHTML = `
      <div class="dashboard-goal-title-row">
        <strong>${goal.name}</strong>
        <span>${progress.toFixed(0)}%</span>
      </div>

      <div class="progress">
        <span style="width:${progress}%"></span>
      </div>

      <div class="dashboard-goal-meta">
        <span>${formatHKD(goal.current)} / ${formatHKD(goal.target)}</span>
        <span>Remaining: ${formatHKD(Math.max(remaining, 0))}</span>
      </div>
    `;

      dashboardSavingGoalsList.appendChild(goalItem);
    });
  }

  function renderDashboardSubscriptions() {
    const dashboardSubscriptionList = document.getElementById(
      "dashboardSubscriptionList",
    );

    if (!dashboardSubscriptionList) return;

    dashboardSubscriptionList.innerHTML = "";

    if (!subscriptions || subscriptions.length === 0) {
      dashboardSubscriptionList.innerHTML = `
      <div class="dashboard-subscription-empty">
        No subscriptions yet.
      </div>
    `;
      return;
    }

    const activeSubscriptions = [...subscriptions]
      .filter((subscription) => subscription.status === "Active")
      .sort((a, b) => new Date(a.nextDate) - new Date(b.nextDate));

    if (activeSubscriptions.length === 0) {
      dashboardSubscriptionList.innerHTML = `
      <div class="dashboard-subscription-empty">
        No active subscriptions.
      </div>
    `;
      return;
    }

    activeSubscriptions.forEach((subscription) => {
      const firstLetter = subscription.item.charAt(0).toUpperCase();

      const feeText =
        subscription.cycle === "Yearly"
          ? `${formatHKD(subscription.fee)} / Year`
          : `${formatHKD(subscription.fee)} / Month`;

      const item = document.createElement("div");
      item.className = "sub-item";

      item.innerHTML = `
      <div class="app-icon default-subscription">
        ${firstLetter}
      </div>

      <div>
        <strong>${subscription.item}</strong>
        <p class="dashboard-subscription-date">
          Next: ${subscription.nextDate}
        </p>
      </div>

      <div class="sub-price">
        <strong>${feeText}</strong>
        <span>${subscription.status}</span>
      </div>
    `;

      dashboardSubscriptionList.appendChild(item);
    });
  }

  function renderDashboardNetWorthSummary() {
    const dashboardNetWorthAssets = document.getElementById(
      "dashboardNetWorthAssets",
    );
    const dashboardNetWorthLiabilities = document.getElementById(
      "dashboardNetWorthLiabilities",
    );
    const dashboardNetWorthValue = document.getElementById(
      "dashboardNetWorthValue",
    );

    if (
      !dashboardNetWorthAssets ||
      !dashboardNetWorthLiabilities ||
      !dashboardNetWorthValue
    ) {
      return;
    }

    const summary = calculateNetWorthSummary();

    dashboardNetWorthAssets.textContent = formatHKD(summary.totalAssets);
    dashboardNetWorthLiabilities.textContent = formatHKD(
      summary.totalLiabilities,
    );
    dashboardNetWorthValue.textContent = formatHKD(summary.netWorth);

    dashboardNetWorthValue.classList.toggle("purple", summary.netWorth >= 0);
    dashboardNetWorthValue.classList.toggle("red", summary.netWorth < 0);
  }

  function renderDashboardInvestmentSummary() {
    const dashboardInvestmentCost = document.getElementById(
      "dashboardInvestmentCost",
    );
    const dashboardInvestmentValue = document.getElementById(
      "dashboardInvestmentValue",
    );
    const dashboardInvestmentGainLoss = document.getElementById(
      "dashboardInvestmentGainLoss",
    );
    const dashboardInvestmentReturnRate = document.getElementById(
      "dashboardInvestmentReturnRate",
    );

    if (
      !dashboardInvestmentCost ||
      !dashboardInvestmentValue ||
      !dashboardInvestmentGainLoss ||
      !dashboardInvestmentReturnRate
    ) {
      return;
    }

    const summary = calculateInvestmentSummary();

    dashboardInvestmentCost.textContent = formatHKD(summary.totalCost);
    dashboardInvestmentValue.textContent = formatHKD(summary.totalValue);
    dashboardInvestmentGainLoss.textContent = formatHKD(summary.gainLoss);
    dashboardInvestmentReturnRate.textContent = `${summary.returnRate.toFixed(1)}%`;

    dashboardInvestmentGainLoss.classList.toggle(
      "green",
      summary.gainLoss >= 0,
    );
    dashboardInvestmentGainLoss.classList.toggle("red", summary.gainLoss < 0);

    dashboardInvestmentReturnRate.classList.toggle(
      "green",
      summary.returnRate >= 0,
    );
    dashboardInvestmentReturnRate.classList.toggle(
      "red",
      summary.returnRate < 0,
    );
  }

  // =========================
  // BUDGET PLANNER
  // =========================

  function getActualSpendingByCategory(month) {
    const actualMap = {};

    transactions.forEach((transaction) => {
      if (!transaction.date) return;

      const transactionMonth = getTransactionMonth(transaction.date);

      if (transactionMonth !== month) return;
      if (transaction.status !== "Completed") return;
      if (transaction.type !== "Expense") return;

      const category = transaction.category || "Others";

      if (!actualMap[category]) {
        actualMap[category] = 0;
      }

      actualMap[category] += Number(transaction.amount);
    });

    return actualMap;
  }

  function getBudgetCategories(month) {
    const categorySet = new Set();
    const monthBudget = getBudgetForMonth(month);

    if (settings && Array.isArray(settings.categories)) {
      settings.categories.forEach((category) => {
        if (category.type === "Expense" || category.type === "Investment") {
          categorySet.add(category.name);
        }
      });
    }

    Object.keys(monthBudget).forEach((category) => {
      categorySet.add(category);
    });

    const actualMap = getActualSpendingByCategory(month);

    Object.keys(actualMap).forEach((category) => {
      categorySet.add(category);
    });

    return Array.from(categorySet);
  }

  function populateBudgetPlannerMonthOptions() {
    const budgetMonthSelect = document.getElementById("budgetPlannerMonth");
    populateMonthSelect(budgetMonthSelect);
  }

  function calculateBudgetPlanner(month) {
    const actualMap = getActualSpendingByCategory(month);
    const categories = getBudgetCategories(month);
    const monthBudget = getBudgetForMonth(month);

    const rows = categories.map((category) => {
      const planned = Number(monthBudget[category] || 0);
      const actual = Number(actualMap[category] || 0);
      const remaining = planned - actual;
      const usage =
        planned > 0 ? (actual / planned) * 100 : actual > 0 ? 100 : 0;

      return {
        category,
        planned,
        actual,
        remaining,
        usage,
      };
    });

    const totalPlanned = rows.reduce((sum, row) => sum + row.planned, 0);
    const totalActual = rows.reduce((sum, row) => sum + row.actual, 0);
    const totalRemaining = totalPlanned - totalActual;
    const overCount = rows.filter((row) => row.remaining < 0).length;

    return {
      rows,
      totalPlanned,
      totalActual,
      totalRemaining,
      overCount,
    };
  }

  function renderBudgetPlanner() {
    const budgetTableBody = document.getElementById("budgetPlannerTableBody");
    const budgetMonthSelect = document.getElementById("budgetPlannerMonth");

    const budgetTotalPlanned = document.getElementById("budgetTotalPlanned");
    const budgetTotalActual = document.getElementById("budgetTotalActual");
    const budgetRemaining = document.getElementById("budgetRemaining");
    const budgetOverCount = document.getElementById("budgetOverCount");

    if (
      !budgetTableBody ||
      !budgetMonthSelect ||
      !budgetTotalPlanned ||
      !budgetTotalActual ||
      !budgetRemaining ||
      !budgetOverCount
    ) {
      return;
    }

    populateBudgetPlannerMonthOptions();

    const currentSelectedMonth = getSelectedMonth();
    budgetMonthSelect.value = currentSelectedMonth;

    const budgetData = calculateBudgetPlanner(currentSelectedMonth);

    budgetTotalPlanned.textContent = formatHKD(budgetData.totalPlanned);
    budgetTotalActual.textContent = formatHKD(budgetData.totalActual);
    budgetRemaining.textContent = formatHKD(budgetData.totalRemaining);
    budgetOverCount.textContent = budgetData.overCount;

    budgetRemaining.classList.toggle("green", budgetData.totalRemaining >= 0);
    budgetRemaining.classList.toggle("red", budgetData.totalRemaining < 0);

    budgetTableBody.innerHTML = "";

    budgetData.rows.forEach((row) => {
      const remainingClass = row.remaining >= 0 ? "green" : "red";
      const usageWidth = Math.min(row.usage, 100);
      const usageClass =
        row.usage >= 100 ? "danger" : row.usage >= 80 ? "warning" : "";

      const tableRow = document.createElement("tr");

      tableRow.innerHTML = `
        <td><strong>${row.category}</strong></td>
        <td>
          <input
            class="budget-input"
            type="number"
            min="0"
            step="1"
            value="${row.planned}"
            data-category="${row.category}"
          />
        </td>
        <td class="red">${formatHKD(row.actual)}</td>
        <td class="${remainingClass}">${formatHKD(row.remaining)}</td>
        <td>
          <div class="budget-usage-cell">
            <div class="budget-usage-bar ${usageClass}">
              <span style="width:${usageWidth}%"></span>
            </div>
            <span class="budget-usage-percent">${row.usage.toFixed(0)}%</span>
          </div>
        </td>
      `;

      budgetTableBody.appendChild(tableRow);
    });
  }

  function saveBudgetInputs() {
    const budgetInputs = document.querySelectorAll(".budget-input");
    const budgetMonthSelect = document.getElementById("budgetPlannerMonth");

    const currentBudgetMonth = budgetMonthSelect
      ? budgetMonthSelect.value
      : getSelectedMonth();

    const monthBudget = getBudgetForMonth(currentBudgetMonth);

    budgetInputs.forEach((input) => {
      const category = input.dataset.category;
      const plannedValue = Number(input.value);

      monthBudget[category] = plannedValue;
    });

    saveBudgets();
    renderBudgetPlanner();
    renderDashboard();

    showToast(`Budget saved for ${currentBudgetMonth}.`, "success");

    syncBudgetMonthToCloud(currentBudgetMonth);
  }

  function copyPreviousMonthBudget() {
    const budgetMonthSelect = document.getElementById("budgetPlannerMonth");

    const targetMonth = budgetMonthSelect
      ? budgetMonthSelect.value
      : getSelectedMonth();

    const previousMonth = getPreviousMonth(targetMonth);
    const previousBudget = budgets[previousMonth];

    if (
      !isPlainObject(previousBudget) ||
      Object.keys(previousBudget).length === 0
    ) {
      showToast(`No budget found for ${previousMonth}.`, "warning");
      return;
    }

    const confirmed = confirm(
      `Copy budget from ${previousMonth} to ${targetMonth}?\n\nThis will replace the planned budget for ${targetMonth}.`,
    );

    if (!confirmed) return;

    budgets[targetMonth] = {
      ...previousBudget,
    };

    saveBudgets();
    renderBudgetPlanner();
    renderDashboard();

    showToast(
      `Budget copied from ${previousMonth} to ${targetMonth}.`,
      "success",
    );

    syncBudgetMonthToCloud(targetMonth);
  }

  // =========================
  // SAVING GOALS
  // =========================

  function calculateGoalProgress(current, target) {
    if (Number(target) <= 0) return 0;
    return Math.min((Number(current) / Number(target)) * 100, 100);
  }

  function validateSavingGoalForm() {
    const savingGoalForm = document.getElementById("savingGoalForm");

    const nameInput = document.getElementById("goalName");
    const targetInput = document.getElementById("goalTarget");
    const currentInput = document.getElementById("goalCurrent");
    const deadlineInput = document.getElementById("goalDeadline");
    const statusInput = document.getElementById("goalStatus");

    clearFormError(savingGoalForm);

    const name = getTrimmedInputValue(nameInput);
    const target = Number(targetInput.value);
    const current = Number(currentInput.value);
    const deadline = getTrimmedInputValue(deadlineInput);
    const status = getTrimmedInputValue(statusInput);

    if (!name) {
      showFormError(savingGoalForm, "Please enter a goal name.", nameInput);
      return null;
    }

    if (!Number.isFinite(target) || target <= 0) {
      showFormError(
        savingGoalForm,
        "Target amount must be greater than 0.",
        targetInput,
      );
      return null;
    }

    if (!Number.isFinite(current) || current < 0) {
      showFormError(
        savingGoalForm,
        "Current amount cannot be negative.",
        currentInput,
      );
      return null;
    }

    if (current > target) {
      showFormError(
        savingGoalForm,
        "Current amount cannot be greater than target amount.",
        currentInput,
      );
      return null;
    }

    if (!deadline) {
      showFormError(savingGoalForm, "Please select a deadline.", deadlineInput);
      return null;
    }

    if (!status) {
      showFormError(savingGoalForm, "Please select a status.", statusInput);
      return null;
    }

    return {
      name,
      target,
      current,
      deadline,
      status,
    };
  }

  function renderSavingGoals() {
    const goalsList = document.getElementById("savingGoalsList");

    const goalsTotalTarget = document.getElementById("goalsTotalTarget");
    const goalsTotalSaved = document.getElementById("goalsTotalSaved");
    const goalsTotalRemaining = document.getElementById("goalsTotalRemaining");
    const goalsOverallProgress = document.getElementById(
      "goalsOverallProgress",
    );

    if (
      !goalsList ||
      !goalsTotalTarget ||
      !goalsTotalSaved ||
      !goalsTotalRemaining ||
      !goalsOverallProgress
    ) {
      return;
    }

    const totalTarget = savingGoals.reduce(
      (sum, goal) => sum + Number(goal.target),
      0,
    );
    const totalSaved = savingGoals.reduce(
      (sum, goal) => sum + Number(goal.current),
      0,
    );
    const totalRemaining = totalTarget - totalSaved;
    const overallProgress =
      totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

    goalsTotalTarget.textContent = formatHKD(totalTarget);
    goalsTotalSaved.textContent = formatHKD(totalSaved);
    goalsTotalRemaining.textContent = formatHKD(Math.max(totalRemaining, 0));
    goalsOverallProgress.textContent = `${overallProgress.toFixed(0)}%`;

    goalsList.innerHTML = "";

    if (savingGoals.length === 0) {
      goalsList.innerHTML = `
        <div class="empty-state">
          No saving goals yet. Click "Add Goal" to create your first goal.
        </div>
      `;
      return;
    }

    savingGoals.forEach((goal) => {
      const progress = calculateGoalProgress(goal.current, goal.target);
      const remaining = Number(goal.target) - Number(goal.current);
      const displayStatus =
        Number(goal.current) >= Number(goal.target) ? "Completed" : goal.status;
      const statusClass = displayStatus.toLowerCase();

      const goalCard = document.createElement("article");
      goalCard.className = "goal-page-card";

      goalCard.innerHTML = `
        <div class="goal-page-header">
          <div>
            <h3>${goal.name}</h3>
            <p class="goal-deadline">Deadline: ${goal.deadline}</p>
          </div>

          <span class="goal-status ${statusClass}">
            ${displayStatus}
          </span>
        </div>

        <div class="goal-amount-row">
          <div>
            <p>Saved</p>
            <strong class="green">${formatHKD(goal.current)}</strong>
          </div>

          <div>
            <p>Target</p>
            <strong>${formatHKD(goal.target)}</strong>
          </div>

          <div>
            <p>Remaining</p>
            <strong class="${remaining <= 0 ? "green" : "red"}">
              ${formatHKD(Math.max(remaining, 0))}
            </strong>
          </div>
        </div>

        <div class="goal-progress">
          <span style="width:${progress}%"></span>
        </div>

        <div class="goal-footer">
          <span class="goal-progress-text">${progress.toFixed(0)}%</span>

          <div class="action-buttons">
            <button class="edit-transaction-btn edit-goal-btn" data-id="${goal.id}" type="button" aria-label="Edit goal">
              <i data-lucide="pencil"></i>
            </button>

            <button class="delete-transaction-btn delete-goal-btn" data-id="${goal.id}" type="button" aria-label="Delete goal">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>
      `;

      goalsList.appendChild(goalCard);
    });

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  function setSavingGoalModalMode(mode) {
    const savingGoalModalTitle = document.getElementById(
      "savingGoalModalTitle",
    );
    const savingGoalSubmitBtn = document.getElementById("savingGoalSubmitBtn");

    if (!savingGoalModalTitle || !savingGoalSubmitBtn) return;

    if (mode === "edit") {
      savingGoalModalTitle.textContent = "Edit Saving Goal";
      savingGoalSubmitBtn.textContent = "Update Goal";
    } else {
      savingGoalModalTitle.textContent = "Add Saving Goal";
      savingGoalSubmitBtn.textContent = "Save Goal";
    }
  }

  function openSavingGoalModal() {
    const savingGoalModal = document.getElementById("savingGoalModal");
    const savingGoalForm = document.getElementById("savingGoalForm");

    if (!savingGoalModal || !savingGoalForm) return;

    editingGoalId = null;
    savingGoalForm.reset();
    setSavingGoalModalMode("add");

    document.getElementById("goalDeadline").value = getDefaultGoalDeadline();
    document.getElementById("goalStatus").value = "Active";

    savingGoalModal.classList.add("is-open");
  }

  function openEditSavingGoalModal(goalId) {
    const goal = savingGoals.find((item) => item.id === goalId);
    const savingGoalModal = document.getElementById("savingGoalModal");

    if (!goal || !savingGoalModal) return;

    editingGoalId = goalId;
    setSavingGoalModalMode("edit");

    document.getElementById("goalName").value = goal.name;
    document.getElementById("goalTarget").value = goal.target;
    document.getElementById("goalCurrent").value = goal.current;
    document.getElementById("goalDeadline").value = goal.deadline;
    document.getElementById("goalStatus").value = goal.status;

    savingGoalModal.classList.add("is-open");
  }

  function closeSavingGoalModal() {
    const savingGoalModal = document.getElementById("savingGoalModal");
    const savingGoalForm = document.getElementById("savingGoalForm");

    if (savingGoalModal) {
      savingGoalModal.classList.remove("is-open");
    }

    if (savingGoalForm) {
      clearFormError(savingGoalForm);
      savingGoalForm.reset();
    }

    editingGoalId = null;
    setSavingGoalModalMode("add");
  }

  function deleteSavingGoal(goalId) {
    const confirmed = confirm(
      "Are you sure you want to delete this saving goal?",
    );

    if (!confirmed) return;

    savingGoals = savingGoals.filter((goal) => {
      return goal.id !== goalId;
    });

    saveSavingGoals();
    renderSavingGoals();
    renderDashboard();

    showToast("Saving goal deleted successfully.", "success");

    deleteSavingGoalFromCloud(goalId);
  }

  // =========================
  // SUBSCRIPTIONS
  // =========================

  function getMonthlyEquivalentFee(subscription) {
    const fee = Number(subscription.fee);

    if (subscription.cycle === "Yearly") {
      return fee / 12;
    }

    return fee;
  }

  function isSubscriptionUpcomingThisMonth(subscription) {
    if (!subscription.nextDate) return false;
    if (subscription.status !== "Active") return false;

    const nextMonth = getTransactionMonth(subscription.nextDate);
    return nextMonth === getSelectedMonth();
  }

  function getDefaultSubscriptionTransactionCategory() {
    const subscriptionCategory = (settings.categories || []).find(
      (category) => {
        return category.name === "Subscription";
      },
    );

    if (subscriptionCategory) {
      return subscriptionCategory.name;
    }

    const expenseCategory = (settings.categories || []).find((category) => {
      return category.type === "Expense";
    });

    return expenseCategory ? expenseCategory.name : "Subscription";
  }

  function getDefaultTransactionAccount() {
    const bankAccount = (settings.accounts || []).find((account) => {
      return account.name === "Bank";
    });

    if (bankAccount) {
      return bankAccount.name;
    }

    return settings.accounts && settings.accounts.length > 0
      ? settings.accounts[0].name
      : "Bank";
  }

  function getNextSubscriptionDate(dateString, cycle) {
    if (!dateString) {
      return getDefaultDateForSelectedMonth();
    }

    const [year, month, day] = dateString.split("-").map(Number);
    const nextDate = new Date(year, month - 1, day);

    if (cycle === "Yearly") {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    } else {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }

    const nextYear = nextDate.getFullYear();
    const nextMonth = padTwoDigits(nextDate.getMonth() + 1);
    const nextDay = padTwoDigits(nextDate.getDate());

    return `${nextYear}-${nextMonth}-${nextDay}`;
  }

  function generateTransactionFromSubscription(subscriptionId) {
    const subscription = subscriptions.find((item) => {
      return item.id === subscriptionId;
    });

    if (!subscription) return;

    if (subscription.status !== "Active") {
      showToast(
        "Only active subscriptions can generate transactions.",
        "warning",
      );
      return;
    }

    const amount = Number(subscription.fee);

    if (!Number.isFinite(amount) || amount <= 0) {
      showToast("Subscription fee must be greater than 0.", "error");
      return;
    }

    const transactionDate = subscription.nextDate || getTodayDateString();
    const category = getDefaultSubscriptionTransactionCategory();
    const account = getDefaultTransactionAccount();

    const confirmed = confirm(
      `Create a completed expense transaction for ${subscription.item}?\n\nDate: ${transactionDate}\nAmount: ${formatHKD(amount)}\nCategory: ${category}`,
    );

    if (!confirmed) return;

    const newTransactionId = createId();

    const generatedTransaction = {
      id: newTransactionId,
      date: transactionDate,
      type: "Expense",
      description: `${subscription.item} - ${subscription.plan}`,
      category,
      account,
      amount,
      status: "Completed",
      source: "subscription",
      subscriptionId: subscription.id,
    };

    transactions.unshift(generatedTransaction);

    let updatedSubscription = null;

    subscriptions = subscriptions.map((item) => {
      if (item.id === subscription.id) {
        updatedSubscription = {
          ...item,
          nextDate: getNextSubscriptionDate(item.nextDate, item.cycle),
        };

        return updatedSubscription;
      }

      return item;
    });

    saveTransactions();
    saveSubscriptions();

    renderSubscriptions();
    renderTransactions();

    const transactionSearch = document.getElementById("transactionSearch");
    const categoryFilter = document.getElementById("categoryFilter");
    const typeFilter = document.getElementById("typeFilter");
    const statusFilter = document.getElementById("statusFilter");
    const monthFilter = document.getElementById("monthFilter");

    if (transactionSearch) {
      transactionSearch.value = "";
    }

    if (categoryFilter) {
      categoryFilter.value = "All Categories";
    }

    if (typeFilter) {
      typeFilter.value = "All Types";
    }

    if (statusFilter) {
      statusFilter.value = "All Statuses";
    }

    populateTransactionMonthFilter();

    if (monthFilter) {
      monthFilter.value = "All Months";
    }

    showPage("transactions");
    filterTransactions();

    setTimeout(() => {
      highlightTransactionRow(newTransactionId);
    }, 150);

    showToast(
      `Transaction created for ${subscription.item}. Next payment date updated.`,
      "success",
    );

    upsertTransactionToCloud(generatedTransaction);
    upsertSubscriptionToCloud(updatedSubscription);
  }

  function validateSubscriptionForm() {
    const subscriptionForm = document.getElementById("subscriptionForm");

    const itemInput = document.getElementById("subscriptionItem");
    const planInput = document.getElementById("subscriptionPlan");
    const feeInput = document.getElementById("subscriptionFee");
    const cycleInput = document.getElementById("subscriptionCycle");
    const nextDateInput = document.getElementById("subscriptionNextDate");
    const statusInput = document.getElementById("subscriptionStatus");

    clearFormError(subscriptionForm);

    const item = getTrimmedInputValue(itemInput);
    const plan = getTrimmedInputValue(planInput);
    const fee = Number(feeInput.value);
    const cycle = getTrimmedInputValue(cycleInput);
    const nextDate = getTrimmedInputValue(nextDateInput);
    const status = getTrimmedInputValue(statusInput);

    if (!item) {
      showFormError(
        subscriptionForm,
        "Please enter a subscription item.",
        itemInput,
      );
      return null;
    }

    if (!plan) {
      showFormError(
        subscriptionForm,
        "Please enter a subscription plan.",
        planInput,
      );
      return null;
    }

    if (!Number.isFinite(fee) || fee <= 0) {
      showFormError(
        subscriptionForm,
        "Subscription fee must be greater than 0.",
        feeInput,
      );
      return null;
    }

    if (!cycle) {
      showFormError(
        subscriptionForm,
        "Please select a billing cycle.",
        cycleInput,
      );
      return null;
    }

    if (!nextDate) {
      showFormError(
        subscriptionForm,
        "Please select the next payment date.",
        nextDateInput,
      );
      return null;
    }

    if (!status) {
      showFormError(subscriptionForm, "Please select a status.", statusInput);
      return null;
    }

    return {
      item,
      plan,
      fee,
      cycle,
      nextDate,
      status,
    };
  }

  function renderSubscriptions() {
    const tableBody = document.getElementById("subscriptionTableBody");

    const subscriptionMonthlyTotal = document.getElementById(
      "subscriptionMonthlyTotal",
    );
    const subscriptionActiveCount = document.getElementById(
      "subscriptionActiveCount",
    );
    const subscriptionUpcomingCount = document.getElementById(
      "subscriptionUpcomingCount",
    );
    const subscriptionYearlyEstimate = document.getElementById(
      "subscriptionYearlyEstimate",
    );

    if (
      !tableBody ||
      !subscriptionMonthlyTotal ||
      !subscriptionActiveCount ||
      !subscriptionUpcomingCount ||
      !subscriptionYearlyEstimate
    ) {
      return;
    }

    const activeSubscriptions = subscriptions.filter(
      (subscription) => subscription.status === "Active",
    );

    const monthlyTotal = activeSubscriptions.reduce((sum, subscription) => {
      return sum + getMonthlyEquivalentFee(subscription);
    }, 0);

    const yearlyEstimate = monthlyTotal * 12;

    const upcomingCount = subscriptions.filter((subscription) => {
      return isSubscriptionUpcomingThisMonth(subscription);
    }).length;

    subscriptionMonthlyTotal.textContent = formatHKD(monthlyTotal);
    subscriptionActiveCount.textContent = activeSubscriptions.length;
    subscriptionUpcomingCount.textContent = upcomingCount;
    subscriptionYearlyEstimate.textContent = formatHKD(yearlyEstimate);

    tableBody.innerHTML = "";

    if (subscriptions.length === 0) {
      renderTableEmptyState(
        tableBody,
        7,
        "No subscriptions yet.",
        "Add your recurring payments to track upcoming bills.",
      );

      renderDashboard();

      return;
    }

    subscriptions.forEach((subscription) => {
      const row = document.createElement("tr");
      const statusClass = subscription.status.toLowerCase();

      row.innerHTML = `
        <td>
          <div class="subscription-name">${subscription.item}</div>
          <div class="subscription-plan">${subscription.plan}</div>
        </td>

        <td>${subscription.plan}</td>
        <td class="red">${formatHKD(subscription.fee)}</td>
        <td>${subscription.cycle}</td>
        <td>${subscription.nextDate}</td>

        <td>
          <span class="subscription-status ${statusClass}">
            ${subscription.status}
          </span>
        </td>

        <td>
          <div class="action-buttons">
  <button
    class="generate-transaction-btn generate-subscription-transaction-btn"
    data-id="${subscription.id}"
    type="button"
    aria-label="Generate transaction"
    title="Generate transaction"
  >
    <i data-lucide="receipt-text"></i>
  </button>

  <button class="edit-transaction-btn edit-subscription-btn" data-id="${subscription.id}" type="button" aria-label="Edit subscription">
    <i data-lucide="pencil"></i>
  </button>

  <button class="delete-transaction-btn delete-subscription-btn" data-id="${subscription.id}" type="button" aria-label="Delete subscription">
    <i data-lucide="trash-2"></i>
  </button>
</div>
        </td>
      `;

      tableBody.appendChild(row);
    });

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  function setSubscriptionModalMode(mode) {
    const subscriptionModalTitle = document.getElementById(
      "subscriptionModalTitle",
    );
    const subscriptionSubmitBtn = document.getElementById(
      "subscriptionSubmitBtn",
    );

    if (!subscriptionModalTitle || !subscriptionSubmitBtn) return;

    if (mode === "edit") {
      subscriptionModalTitle.textContent = "Edit Subscription";
      subscriptionSubmitBtn.textContent = "Update Subscription";
    } else {
      subscriptionModalTitle.textContent = "Add Subscription";
      subscriptionSubmitBtn.textContent = "Save Subscription";
    }
  }

  function openSubscriptionModal() {
    const subscriptionModal = document.getElementById("subscriptionModal");
    const subscriptionForm = document.getElementById("subscriptionForm");

    if (!subscriptionModal || !subscriptionForm) return;

    editingSubscriptionId = null;
    subscriptionForm.reset();
    setSubscriptionModalMode("add");

    document.getElementById("subscriptionNextDate").value =
      getDefaultDateForSelectedMonth();
    document.getElementById("subscriptionCycle").value = "Monthly";
    document.getElementById("subscriptionStatus").value = "Active";

    subscriptionModal.classList.add("is-open");
  }

  function openEditSubscriptionModal(subscriptionId) {
    const subscription = subscriptions.find(
      (item) => item.id === subscriptionId,
    );
    const subscriptionModal = document.getElementById("subscriptionModal");

    if (!subscription || !subscriptionModal) return;

    editingSubscriptionId = subscriptionId;
    setSubscriptionModalMode("edit");

    document.getElementById("subscriptionItem").value = subscription.item;
    document.getElementById("subscriptionPlan").value = subscription.plan;
    document.getElementById("subscriptionFee").value = subscription.fee;
    document.getElementById("subscriptionCycle").value = subscription.cycle;
    document.getElementById("subscriptionNextDate").value =
      subscription.nextDate;
    document.getElementById("subscriptionStatus").value = subscription.status;

    subscriptionModal.classList.add("is-open");
  }

  function closeSubscriptionModal() {
    const subscriptionModal = document.getElementById("subscriptionModal");
    const subscriptionForm = document.getElementById("subscriptionForm");

    if (subscriptionModal) {
      subscriptionModal.classList.remove("is-open");
    }

    if (subscriptionForm) {
      clearFormError(subscriptionForm);
      subscriptionForm.reset();
    }

    editingSubscriptionId = null;
    setSubscriptionModalMode("add");
  }

  function deleteSubscription(subscriptionId) {
    const confirmed = confirm(
      "Are you sure you want to delete this subscription?",
    );

    if (!confirmed) return;

    subscriptions = subscriptions.filter((subscription) => {
      return subscription.id !== subscriptionId;
    });

    saveSubscriptions();
    renderSubscriptions();
    renderDashboard();

    showToast("Subscription deleted successfully.", "success");

    deleteSubscriptionFromCloud(subscriptionId);
  }

  // =========================
  // SETTINGS
  // =========================

  function validateCategoryForm() {
    const categoryForm = document.getElementById("categoryForm");

    const categoryNameInput = document.getElementById("categoryName");
    const categoryTypeInput = document.getElementById("categoryType");

    clearFormError(categoryForm);

    const name = getTrimmedInputValue(categoryNameInput);
    const type = getTrimmedInputValue(categoryTypeInput);

    if (!name) {
      showFormError(
        categoryForm,
        "Please enter a category name.",
        categoryNameInput,
      );
      return null;
    }

    if (!type) {
      showFormError(
        categoryForm,
        "Please select a category type.",
        categoryTypeInput,
      );
      return null;
    }

    const duplicatedCategory = settings.categories.some((category) => {
      return category.name.toLowerCase() === name.toLowerCase();
    });

    if (duplicatedCategory) {
      showFormError(
        categoryForm,
        "This category already exists. Please use another name.",
        categoryNameInput,
      );
      return null;
    }

    return {
      name,
      type,
    };
  }

  function validateAccountForm() {
    const accountForm = document.getElementById("accountForm");

    const accountNameInput = document.getElementById("accountName");
    const accountTypeInput = document.getElementById("accountType");

    clearFormError(accountForm);

    const name = getTrimmedInputValue(accountNameInput);
    const type = getTrimmedInputValue(accountTypeInput);

    if (!name) {
      showFormError(
        accountForm,
        "Please enter an account name.",
        accountNameInput,
      );
      return null;
    }

    if (!type) {
      showFormError(
        accountForm,
        "Please select an account type.",
        accountTypeInput,
      );
      return null;
    }

    const duplicatedAccount = settings.accounts.some((account) => {
      return account.name.toLowerCase() === name.toLowerCase();
    });

    if (duplicatedAccount) {
      showFormError(
        accountForm,
        "This account already exists. Please use another name.",
        accountNameInput,
      );
      return null;
    }

    return {
      name,
      type,
    };
  }

  function renderSettings() {
    const categoryList = document.getElementById("categoryList");
    const accountList = document.getElementById("accountList");

    if (!categoryList || !accountList) return;

    categoryList.innerHTML = "";
    accountList.innerHTML = "";

    if (settings.categories.length === 0) {
      categoryList.innerHTML = `
        <div class="settings-empty">No categories yet.</div>
      `;
    } else {
      settings.categories.forEach((category) => {
        const item = document.createElement("div");
        item.className = "settings-item";

        const badgeClass = getBadgeClass(category.type);

        item.innerHTML = `
          <div class="settings-item-main">
            <strong>${category.name}</strong>
            <span class="settings-badge ${badgeClass}">${category.type}</span>
          </div>

          <div class="action-buttons">
  <button
    class="edit-transaction-btn edit-category-btn"
    data-id="${category.id}"
    type="button"
    aria-label="Edit category"
  >
    <i data-lucide="pencil"></i>
  </button>

  <button
    class="delete-transaction-btn delete-category-btn"
    data-id="${category.id}"
    type="button"
    aria-label="Delete category"
  >
    <i data-lucide="trash-2"></i>
  </button>
</div>
        `;

        categoryList.appendChild(item);
      });
    }

    if (settings.accounts.length === 0) {
      accountList.innerHTML = `
        <div class="settings-empty">No accounts yet.</div>
      `;
    } else {
      settings.accounts.forEach((account) => {
        const item = document.createElement("div");
        item.className = "settings-item";

        const badgeClass = getBadgeClass(account.type);

        item.innerHTML = `
          <div class="settings-item-main">
            <strong>${account.name}</strong>
            <span class="settings-badge ${badgeClass}">${account.type}</span>
          </div>

          <div class="action-buttons">
  <button
    class="edit-transaction-btn edit-account-btn"
    data-id="${account.id}"
    type="button"
    aria-label="Edit account"
  >
    <i data-lucide="pencil"></i>
  </button>

  <button
    class="delete-transaction-btn delete-account-btn"
    data-id="${account.id}"
    type="button"
    aria-label="Delete account"
  >
    <i data-lucide="trash-2"></i>
  </button>
</div>
        `;

        accountList.appendChild(item);
      });
    }

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  function addCategory(name, type) {
    const trimmedName = name.trim();

    if (!trimmedName) return;

    const alreadyExists = settings.categories.some((category) => {
      return category.name.toLowerCase() === trimmedName.toLowerCase();
    });

    if (alreadyExists) {
      alert("This category already exists.");
      return;
    }

    settings.categories.push({
      id: createId(),
      name: trimmedName,
      type,
    });

    saveSettings();
    renderSettings();
    populateTransactionDropdowns();
    renderBudgetPlanner();
  }

  function addAccount(name, type) {
    const trimmedName = name.trim();

    if (!trimmedName) return;

    const alreadyExists = settings.accounts.some((account) => {
      return account.name.toLowerCase() === trimmedName.toLowerCase();
    });

    if (alreadyExists) {
      alert("This account already exists.");
      return;
    }

    settings.accounts.push({
      id: createId(),
      name: trimmedName,
      type,
    });

    saveSettings();
    renderSettings();
    populateTransactionDropdowns();
  }

  function getCategoryById(categoryId) {
    return settings.categories.find((category) => category.id === categoryId);
  }

  function getAccountById(accountId) {
    return settings.accounts.find((account) => account.id === accountId);
  }

  function countTransactionsByCategory(categoryName) {
    return transactions.filter((transaction) => {
      return transaction.category === categoryName;
    }).length;
  }

  function countTransactionsByAccount(accountName) {
    return transactions.filter((transaction) => {
      return transaction.account === accountName;
    }).length;
  }

  function editCategory(categoryId) {
    const category = getCategoryById(categoryId);

    if (!category) return;

    const newName = prompt("Enter the new category name:", category.name);

    if (newName === null) return;

    const trimmedName = newName.trim();

    if (!trimmedName) {
      showToast("Category name cannot be empty.", "error");
      return;
    }

    const duplicatedCategory = settings.categories.some((item) => {
      return (
        item.id !== categoryId &&
        item.name.toLowerCase() === trimmedName.toLowerCase()
      );
    });

    if (duplicatedCategory) {
      showToast(
        "This category already exists. Please use another name.",
        "error",
      );
      return;
    }

    const oldName = category.name;

    let updatedCategory = null;

    settings.categories = settings.categories.map((item) => {
      if (item.id === categoryId) {
        updatedCategory = {
          ...item,
          name: trimmedName,
        };

        return updatedCategory;
      }

      return item;
    });

    transactions = transactions.map((transaction) => {
      if (transaction.category === oldName) {
        return {
          ...transaction,
          category: trimmedName,
        };
      }

      return transaction;
    });

    Object.keys(budgets).forEach((month) => {
      const monthBudget = budgets[month];

      if (isPlainObject(monthBudget) && monthBudget[oldName] !== undefined) {
        monthBudget[trimmedName] = monthBudget[oldName];
        delete monthBudget[oldName];
      }
    });

    saveBudgets();

    saveSettings();
    saveTransactions();

    renderSettings();
    populateTransactionDropdowns();
    renderTransactions();
    renderBudgetPlanner();
    renderMonthlySnapshot();
    renderDashboard();
    renderAnalytics();

    showToast(`Category renamed to "${trimmedName}".`, "success");

    upsertSettingItemToCloud("category", updatedCategory);
    replaceCloudTransactionsSilently();
    replaceCloudBudgetsSilently();
  }

  function deleteCategory(categoryId) {
    const category = getCategoryById(categoryId);

    if (!category) return;

    const usedCount = countTransactionsByCategory(category.name);

    if (usedCount > 0) {
      showToast(
        `This category cannot be deleted because it is used by ${usedCount} transaction(s).`,
        "warning",
      );
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to delete the category "${category.name}"?`,
    );

    if (!confirmed) return;

    const deletedCategoryName = category.name;

    settings.categories = settings.categories.filter((item) => {
      return item.id !== categoryId;
    });

    Object.keys(budgets).forEach((month) => {
      const monthBudget = budgets[month];

      if (
        isPlainObject(monthBudget) &&
        monthBudget[category.name] !== undefined
      ) {
        delete monthBudget[category.name];
      }
    });

    saveBudgets();

    saveSettings();
    renderSettings();
    populateTransactionDropdowns();
    renderBudgetPlanner();

    showToast(
      `Category "${deletedCategoryName}" deleted successfully.`,
      "success",
    );

    deleteSettingItemFromCloud("category", categoryId);
    replaceCloudBudgetsSilently();
  }

  function editAccount(accountId) {
    const account = getAccountById(accountId);

    if (!account) return;

    const newName = prompt("Enter the new account name:", account.name);

    if (newName === null) return;

    const trimmedName = newName.trim();

    if (!trimmedName) {
      showToast("Account name cannot be empty.", "error");
      return;
    }

    const duplicatedAccount = settings.accounts.some((item) => {
      return (
        item.id !== accountId &&
        item.name.toLowerCase() === trimmedName.toLowerCase()
      );
    });

    if (duplicatedAccount) {
      showToast(
        "This account already exists. Please use another name.",
        "error",
      );
      return;
    }

    const oldName = account.name;

    let updatedAccount = null;

    settings.accounts = settings.accounts.map((item) => {
      if (item.id === accountId) {
        updatedAccount = {
          ...item,
          name: trimmedName,
        };

        return updatedAccount;
      }

      return item;
    });

    transactions = transactions.map((transaction) => {
      if (transaction.account === oldName) {
        return {
          ...transaction,
          account: trimmedName,
        };
      }

      return transaction;
    });

    saveSettings();
    saveTransactions();

    renderSettings();
    populateTransactionDropdowns();
    renderTransactions();
    renderMonthlySnapshot();
    renderDashboard();
    renderAnalytics();

    showToast(`Account renamed to "${trimmedName}".`, "success");

    upsertSettingItemToCloud("account", updatedAccount);
    replaceCloudTransactionsSilently();
  }

  function deleteAccount(accountId) {
    const account = getAccountById(accountId);

    if (!account) return;

    const usedCount = countTransactionsByAccount(account.name);

    if (usedCount > 0) {
      showToast(
        `This account cannot be deleted because it is used by ${usedCount} transaction(s).`,
        "warning",
      );
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to delete the account "${account.name}"?`,
    );

    if (!confirmed) return;

    const deletedAccountName = account.name;

    settings.accounts = settings.accounts.filter((item) => {
      return item.id !== accountId;
    });

    saveSettings();
    renderSettings();
    populateTransactionDropdowns();

    showToast(
      `Account "${deletedAccountName}" deleted successfully.`,
      "success",
    );

    deleteSettingItemFromCloud("account", accountId);
  }

  function calculateNetWorthSummary() {
    const totalAssets = netWorthItems
      .filter((item) => item.type === "Asset")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const totalLiabilities = netWorthItems
      .filter((item) => item.type === "Liability")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const netWorth = totalAssets - totalLiabilities;

    return {
      totalAssets,
      totalLiabilities,
      netWorth,
      itemCount: netWorthItems.length,
    };
  }

  function validateNetWorthForm() {
    const netWorthForm = document.getElementById("netWorthForm");

    const nameInput = document.getElementById("netWorthName");
    const typeInput = document.getElementById("netWorthType");
    const categoryInput = document.getElementById("netWorthCategory");
    const amountInput = document.getElementById("netWorthAmount");
    const updatedDateInput = document.getElementById("netWorthUpdatedDate");

    clearFormError(netWorthForm);

    const name = getTrimmedInputValue(nameInput);
    const type = getTrimmedInputValue(typeInput);
    const category = getTrimmedInputValue(categoryInput);
    const amount = Number(amountInput.value);
    const updatedDate = getTrimmedInputValue(updatedDateInput);

    if (!name) {
      showFormError(netWorthForm, "Please enter an item name.", nameInput);
      return null;
    }

    if (!type) {
      showFormError(netWorthForm, "Please select a type.", typeInput);
      return null;
    }

    if (!category) {
      showFormError(netWorthForm, "Please select a category.", categoryInput);
      return null;
    }

    if (!Number.isFinite(amount) || amount < 0) {
      showFormError(netWorthForm, "Amount must be 0 or greater.", amountInput);
      return null;
    }

    if (!updatedDate) {
      showFormError(
        netWorthForm,
        "Please select an updated date.",
        updatedDateInput,
      );
      return null;
    }

    return {
      name,
      type,
      category,
      amount,
      updatedDate,
    };
  }

  function renderNetWorthTracking() {
    const netWorthTableBody = document.getElementById("netWorthTableBody");

    const netWorthTotalAssets = document.getElementById("netWorthTotalAssets");
    const netWorthTotalLiabilities = document.getElementById(
      "netWorthTotalLiabilities",
    );
    const netWorthValue = document.getElementById("netWorthValue");
    const netWorthItemCount = document.getElementById("netWorthItemCount");

    if (
      !netWorthTableBody ||
      !netWorthTotalAssets ||
      !netWorthTotalLiabilities ||
      !netWorthValue ||
      !netWorthItemCount
    ) {
      return;
    }

    const summary = calculateNetWorthSummary();

    netWorthTotalAssets.textContent = formatHKD(summary.totalAssets);
    netWorthTotalLiabilities.textContent = formatHKD(summary.totalLiabilities);
    netWorthValue.textContent = formatHKD(summary.netWorth);
    netWorthItemCount.textContent = summary.itemCount;

    netWorthValue.classList.toggle("purple", summary.netWorth >= 0);
    netWorthValue.classList.toggle("red", summary.netWorth < 0);

    netWorthTableBody.innerHTML = "";

    if (netWorthItems.length === 0) {
      renderTableEmptyState(
        netWorthTableBody,
        6,
        "No net worth items yet.",
        "Add your assets and liabilities to calculate your net worth.",
      );

      renderDashboard();

      return;
    }

    netWorthItems.forEach((item) => {
      const row = document.createElement("tr");
      const typeClass = item.type.toLowerCase();
      const amountClass = item.type === "Asset" ? "green" : "red";

      row.innerHTML = `
      <td><strong>${item.name}</strong></td>

      <td>
        <span class="networth-type ${typeClass}">
          ${item.type}
        </span>
      </td>

      <td>${item.category}</td>

      <td class="${amountClass}">
        ${formatHKD(item.amount)}
      </td>

      <td>${item.updatedDate}</td>

      <td>
        <div class="action-buttons">
          <button
            class="edit-transaction-btn edit-networth-btn"
            data-id="${item.id}"
            type="button"
            aria-label="Edit net worth item"
          >
            <i data-lucide="pencil"></i>
          </button>

          <button
            class="delete-transaction-btn delete-networth-btn"
            data-id="${item.id}"
            type="button"
            aria-label="Delete net worth item"
          >
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </td>
    `;

      netWorthTableBody.appendChild(row);
    });

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  function setNetWorthModalMode(mode) {
    const netWorthModalTitle = document.getElementById("netWorthModalTitle");
    const netWorthSubmitBtn = document.getElementById("netWorthSubmitBtn");

    if (!netWorthModalTitle || !netWorthSubmitBtn) return;

    if (mode === "edit") {
      netWorthModalTitle.textContent = "Edit Net Worth Item";
      netWorthSubmitBtn.textContent = "Update Item";
    } else {
      netWorthModalTitle.textContent = "Add Net Worth Item";
      netWorthSubmitBtn.textContent = "Save Item";
    }
  }

  function openNetWorthModal() {
    const netWorthModal = document.getElementById("netWorthModal");
    const netWorthForm = document.getElementById("netWorthForm");

    if (!netWorthModal || !netWorthForm) return;

    editingNetWorthId = null;
    netWorthForm.reset();
    setNetWorthModalMode("add");

    document.getElementById("netWorthType").value = "Asset";
    document.getElementById("netWorthCategory").value = "Bank";
    document.getElementById("netWorthUpdatedDate").value = getTodayDateString();

    netWorthModal.classList.add("is-open");
  }

  function openEditNetWorthModal(itemId) {
    const item = netWorthItems.find(
      (netWorthItem) => netWorthItem.id === itemId,
    );
    const netWorthModal = document.getElementById("netWorthModal");

    if (!item || !netWorthModal) return;

    editingNetWorthId = itemId;
    setNetWorthModalMode("edit");

    document.getElementById("netWorthName").value = item.name;
    document.getElementById("netWorthType").value = item.type;
    document.getElementById("netWorthCategory").value = item.category;
    document.getElementById("netWorthAmount").value = item.amount;
    document.getElementById("netWorthUpdatedDate").value = item.updatedDate;

    netWorthModal.classList.add("is-open");
  }

  function closeNetWorthModal() {
    const netWorthModal = document.getElementById("netWorthModal");
    const netWorthForm = document.getElementById("netWorthForm");

    if (netWorthModal) {
      netWorthModal.classList.remove("is-open");
    }

    if (netWorthForm) {
      clearFormError(netWorthForm);
      netWorthForm.reset();
    }

    editingNetWorthId = null;
    setNetWorthModalMode("add");
  }

  function deleteNetWorthItem(itemId) {
    const confirmed = confirm(
      "Are you sure you want to delete this net worth item?",
    );

    if (!confirmed) return;

    netWorthItems = netWorthItems.filter((item) => {
      return item.id !== itemId;
    });

    saveNetWorthItems();
    renderNetWorthTracking();
    renderDashboard();

    showToast("Net worth item deleted successfully.", "success");

    deleteNetWorthItemFromCloud(itemId);
  }

  function calculateInvestmentReturn(cost, value) {
    if (Number(cost) <= 0) return 0;
    return ((Number(value) - Number(cost)) / Number(cost)) * 100;
  }

  function calculateInvestmentSummary() {
    const totalCost = investments.reduce((sum, investment) => {
      return sum + Number(investment.cost);
    }, 0);

    const totalValue = investments.reduce((sum, investment) => {
      return sum + Number(investment.value);
    }, 0);

    const gainLoss = totalValue - totalCost;
    const returnRate = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

    return {
      totalCost,
      totalValue,
      gainLoss,
      returnRate,
      itemCount: investments.length,
    };
  }

  function validateInvestmentForm() {
    const investmentForm = document.getElementById("investmentForm");

    const nameInput = document.getElementById("investmentName");
    const typeInput = document.getElementById("investmentType");
    const platformInput = document.getElementById("investmentPlatform");
    const costInput = document.getElementById("investmentCost");
    const valueInput = document.getElementById("investmentValue");
    const updatedDateInput = document.getElementById("investmentUpdatedDate");

    clearFormError(investmentForm);

    const name = getTrimmedInputValue(nameInput);
    const type = getTrimmedInputValue(typeInput);
    const platform = getTrimmedInputValue(platformInput);
    const cost = Number(costInput.value);
    const value = Number(valueInput.value);
    const updatedDate = getTrimmedInputValue(updatedDateInput);

    if (!name) {
      showFormError(
        investmentForm,
        "Please enter an investment name.",
        nameInput,
      );
      return null;
    }

    if (!type) {
      showFormError(
        investmentForm,
        "Please select an investment type.",
        typeInput,
      );
      return null;
    }

    if (!platform) {
      showFormError(investmentForm, "Please enter a platform.", platformInput);
      return null;
    }

    if (!Number.isFinite(cost) || cost < 0) {
      showFormError(investmentForm, "Cost must be 0 or greater.", costInput);
      return null;
    }

    if (!Number.isFinite(value) || value < 0) {
      showFormError(
        investmentForm,
        "Current value must be 0 or greater.",
        valueInput,
      );
      return null;
    }

    if (!updatedDate) {
      showFormError(
        investmentForm,
        "Please select an updated date.",
        updatedDateInput,
      );
      return null;
    }

    return {
      name,
      type,
      platform,
      cost,
      value,
      updatedDate,
    };
  }

  function renderInvestmentTracking() {
    const investmentTableBody = document.getElementById("investmentTableBody");

    const investmentTotalCost = document.getElementById("investmentTotalCost");
    const investmentTotalValue = document.getElementById(
      "investmentTotalValue",
    );
    const investmentGainLoss = document.getElementById("investmentGainLoss");
    const investmentReturnRate = document.getElementById(
      "investmentReturnRate",
    );

    if (
      !investmentTableBody ||
      !investmentTotalCost ||
      !investmentTotalValue ||
      !investmentGainLoss ||
      !investmentReturnRate
    ) {
      return;
    }

    const summary = calculateInvestmentSummary();

    investmentTotalCost.textContent = formatHKD(summary.totalCost);
    investmentTotalValue.textContent = formatHKD(summary.totalValue);
    investmentGainLoss.textContent = formatHKD(summary.gainLoss);
    investmentReturnRate.textContent = `${summary.returnRate.toFixed(1)}%`;

    investmentGainLoss.classList.toggle("green", summary.gainLoss >= 0);
    investmentGainLoss.classList.toggle("red", summary.gainLoss < 0);

    investmentReturnRate.classList.toggle("green", summary.returnRate >= 0);
    investmentReturnRate.classList.toggle("red", summary.returnRate < 0);

    investmentTableBody.innerHTML = "";

    if (investments.length === 0) {
      renderTableEmptyState(
        investmentTableBody,
        9,
        "No investments yet.",
        "Add your investment holdings to track portfolio performance.",
      );

      renderDashboard();

      return;
    }

    investments.forEach((investment) => {
      const gainLoss = Number(investment.value) - Number(investment.cost);
      const returnRate = calculateInvestmentReturn(
        investment.cost,
        investment.value,
      );

      const gainLossClass = gainLoss >= 0 ? "green" : "red";
      const returnClass = returnRate >= 0 ? "positive" : "negative";

      const row = document.createElement("tr");

      row.innerHTML = `
      <td><strong>${investment.name}</strong></td>

      <td>
        <span class="investment-type">
          ${investment.type}
        </span>
      </td>

      <td>${investment.platform}</td>

      <td class="blue">${formatHKD(investment.cost)}</td>

      <td class="purple">${formatHKD(investment.value)}</td>

      <td class="${gainLossClass}">
        ${formatHKD(gainLoss)}
      </td>

      <td>
        <span class="investment-return ${returnClass}">
          ${returnRate.toFixed(1)}%
        </span>
      </td>

      <td>${investment.updatedDate}</td>

      <td>
        <div class="action-buttons">
          <button
            class="edit-transaction-btn edit-investment-btn"
            data-id="${investment.id}"
            type="button"
            aria-label="Edit investment"
          >
            <i data-lucide="pencil"></i>
          </button>

          <button
            class="delete-transaction-btn delete-investment-btn"
            data-id="${investment.id}"
            type="button"
            aria-label="Delete investment"
          >
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </td>
    `;

      investmentTableBody.appendChild(row);
    });

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  function setInvestmentModalMode(mode) {
    const investmentModalTitle = document.getElementById(
      "investmentModalTitle",
    );
    const investmentSubmitBtn = document.getElementById("investmentSubmitBtn");

    if (!investmentModalTitle || !investmentSubmitBtn) return;

    if (mode === "edit") {
      investmentModalTitle.textContent = "Edit Investment";
      investmentSubmitBtn.textContent = "Update Investment";
    } else {
      investmentModalTitle.textContent = "Add Investment";
      investmentSubmitBtn.textContent = "Save Investment";
    }
  }

  function openInvestmentModal() {
    const investmentModal = document.getElementById("investmentModal");
    const investmentForm = document.getElementById("investmentForm");

    if (!investmentModal || !investmentForm) return;

    editingInvestmentId = null;
    investmentForm.reset();
    setInvestmentModalMode("add");

    document.getElementById("investmentType").value = "ETF";
    document.getElementById("investmentUpdatedDate").value =
      getTodayDateString();

    investmentModal.classList.add("is-open");
  }

  function openEditInvestmentModal(investmentId) {
    const investment = investments.find((item) => item.id === investmentId);
    const investmentModal = document.getElementById("investmentModal");

    if (!investment || !investmentModal) return;

    editingInvestmentId = investmentId;
    setInvestmentModalMode("edit");

    document.getElementById("investmentName").value = investment.name;
    document.getElementById("investmentType").value = investment.type;
    document.getElementById("investmentPlatform").value = investment.platform;
    document.getElementById("investmentCost").value = investment.cost;
    document.getElementById("investmentValue").value = investment.value;
    document.getElementById("investmentUpdatedDate").value =
      investment.updatedDate;

    investmentModal.classList.add("is-open");
  }

  function closeInvestmentModal() {
    const investmentModal = document.getElementById("investmentModal");
    const investmentForm = document.getElementById("investmentForm");

    if (investmentModal) {
      investmentModal.classList.remove("is-open");
    }

    if (investmentForm) {
      clearFormError(investmentForm);
      investmentForm.reset();
    }

    editingInvestmentId = null;
    setInvestmentModalMode("add");
  }

  function deleteInvestment(investmentId) {
    const confirmed = confirm(
      "Are you sure you want to delete this investment?",
    );

    if (!confirmed) return;

    investments = investments.filter((investment) => {
      return investment.id !== investmentId;
    });

    saveInvestments();
    renderInvestmentTracking();
    renderDashboard();

    showToast("Investment deleted successfully.", "success");

    deleteInvestmentFromCloud(investmentId);
  }

  function getShortMonthLabel(monthKey) {
    const date = new Date(`${monthKey}-01T00:00:00`);

    return date.toLocaleString("en-US", {
      month: "short",
    });
  }

  function populateAnalyticsMonthOptions() {
    const analyticsMonth = document.getElementById("analyticsMonth");

    if (!analyticsMonth) return;

    const currentValue = analyticsMonth.value;
    const months = getAvailableMonths();

    analyticsMonth.innerHTML = "";

    const fallbackMonth = getSelectedMonth();

    analyticsMonth.innerHTML = `
  <option value="${fallbackMonth}">${fallbackMonth}</option>
`;

    analyticsMonth.value = fallbackMonth;

    months.forEach((month) => {
      const option = document.createElement("option");
      option.value = month;
      option.textContent = month;
      analyticsMonth.appendChild(option);
    });

    analyticsMonth.value = months.includes(currentValue)
      ? currentValue
      : months[0];
  }

  function getAnalyticsSnapshots() {
    return getAvailableMonths()
      .sort()
      .map((month) => calculateMonthlySnapshot(month));
  }

  function calculateCategoryBreakdown(month) {
    const categoryMap = {};

    transactions.forEach((transaction) => {
      if (!transaction.date) return;
      if (transaction.status !== "Completed") return;
      if (transaction.type !== "Expense") return;
      if (transaction.category === "Investment") return;

      const transactionMonth = getTransactionMonth(transaction.date);

      if (transactionMonth !== month) return;

      const category = transaction.category || "Others";

      if (!categoryMap[category]) {
        categoryMap[category] = {
          category,
          amount: 0,
          count: 0,
        };
      }

      categoryMap[category].amount += Number(transaction.amount);
      categoryMap[category].count += 1;
    });

    const breakdown = Object.values(categoryMap).sort(
      (a, b) => b.amount - a.amount,
    );

    const total = breakdown.reduce((sum, item) => {
      return sum + item.amount;
    }, 0);

    return {
      breakdown,
      total,
    };
  }

  function renderAnalyticsSummary() {
    const analyticsBestSavingMonth = document.getElementById(
      "analyticsBestSavingMonth",
    );
    const analyticsAverageExpense = document.getElementById(
      "analyticsAverageExpense",
    );
    const analyticsAverageSavingRate = document.getElementById(
      "analyticsAverageSavingRate",
    );
    const analyticsTopCategory = document.getElementById(
      "analyticsTopCategory",
    );
    const analyticsMonth = document.getElementById("analyticsMonth");

    if (
      !analyticsBestSavingMonth ||
      !analyticsAverageExpense ||
      !analyticsAverageSavingRate ||
      !analyticsTopCategory ||
      !analyticsMonth
    ) {
      return;
    }

    const snapshots = getAnalyticsSnapshots();

    if (snapshots.length === 0) {
      analyticsBestSavingMonth.textContent = "-";
      analyticsAverageExpense.textContent = formatHKD(0);
      analyticsAverageSavingRate.textContent = "0%";
      analyticsTopCategory.textContent = "-";
      return;
    }

    const bestSavingSnapshot = [...snapshots].sort(
      (a, b) => b.saving - a.saving,
    )[0];

    const averageExpense =
      snapshots.reduce((sum, snapshot) => sum + snapshot.expense, 0) /
      snapshots.length;

    const averageSavingRate =
      snapshots.reduce((sum, snapshot) => sum + snapshot.savingRate, 0) /
      snapshots.length;

    const selectedMonth = analyticsMonth.value;
    const categoryData = calculateCategoryBreakdown(selectedMonth);
    const topCategory = categoryData.breakdown[0];

    analyticsBestSavingMonth.textContent = bestSavingSnapshot.month;
    analyticsAverageExpense.textContent = formatHKD(averageExpense);
    analyticsAverageSavingRate.textContent = `${averageSavingRate.toFixed(1)}%`;
    analyticsTopCategory.textContent = topCategory ? topCategory.category : "-";
  }

  function renderAnalyticsTrend() {
    const analyticsTrendBars = document.getElementById("analyticsTrendBars");

    if (!analyticsTrendBars) return;

    const snapshots = getAnalyticsSnapshots();

    analyticsTrendBars.innerHTML = "";

    if (snapshots.length === 0) {
      analyticsTrendBars.innerHTML = `
      <div class="analytics-empty">
        No monthly data yet.
      </div>
    `;
      return;
    }

    const maxValue = Math.max(
      ...snapshots.map((snapshot) => snapshot.income),
      ...snapshots.map((snapshot) => snapshot.expense),
      ...snapshots.map((snapshot) => Math.abs(snapshot.saving)),
      1,
    );

    snapshots.forEach((snapshot) => {
      const incomeHeight = (snapshot.income / maxValue) * 100;
      const expenseHeight = (snapshot.expense / maxValue) * 100;
      const savingHeight = (Math.abs(snapshot.saving) / maxValue) * 100;

      const monthGroup = document.createElement("div");
      monthGroup.className = "analytics-month-group";

      monthGroup.innerHTML = `
      <div class="analytics-bars-set">
        <div
          class="analytics-bar income"
          style="height:${incomeHeight}%"
          title="Income: ${formatHKD(snapshot.income)}"
        ></div>

        <div
          class="analytics-bar expense"
          style="height:${expenseHeight}%"
          title="Expense: ${formatHKD(snapshot.expense)}"
        ></div>

        <div
          class="analytics-bar saving"
          style="height:${savingHeight}%"
          title="Saving: ${formatHKD(snapshot.saving)}"
        ></div>
      </div>

      <span class="analytics-month-label">${getShortMonthLabel(snapshot.month)}</span>
    `;

      analyticsTrendBars.appendChild(monthGroup);
    });
  }

  function renderAnalyticsCategoryBreakdown() {
    const analyticsCategoryBreakdown = document.getElementById(
      "analyticsCategoryBreakdown",
    );
    const analyticsMonth = document.getElementById("analyticsMonth");

    if (!analyticsCategoryBreakdown || !analyticsMonth) return;

    const selectedMonth = analyticsMonth.value;
    const categoryData = calculateCategoryBreakdown(selectedMonth);

    analyticsCategoryBreakdown.innerHTML = "";

    if (categoryData.breakdown.length === 0) {
      analyticsCategoryBreakdown.innerHTML = `
      <div class="analytics-empty">
        No completed expense records for this month.
      </div>
    `;
      return;
    }

    categoryData.breakdown.forEach((item) => {
      const percentage =
        categoryData.total > 0 ? (item.amount / categoryData.total) * 100 : 0;

      const row = document.createElement("div");
      row.className = "analytics-category-item";

      row.innerHTML = `
      <div class="analytics-category-top">
        <strong>${item.category}</strong>
        <span class="red">${formatHKD(item.amount)}</span>
      </div>

      <div class="budget-usage-bar">
        <span style="width:${Math.min(percentage, 100)}%"></span>
      </div>

      <div class="analytics-category-meta">
        ${item.count} transaction${item.count > 1 ? "s" : ""} · ${percentage.toFixed(0)}%
      </div>
    `;

      analyticsCategoryBreakdown.appendChild(row);
    });
  }

  function renderAnalyticsMonthlyTable() {
    const analyticsMonthlyTableBody = document.getElementById(
      "analyticsMonthlyTableBody",
    );

    if (!analyticsMonthlyTableBody) return;

    const snapshots = getAnalyticsSnapshots().sort((a, b) => {
      return b.month.localeCompare(a.month);
    });

    analyticsMonthlyTableBody.innerHTML = "";

    if (snapshots.length === 0) {
      analyticsMonthlyTableBody.innerHTML = `
      <tr>
        <td colspan="7">No monthly performance data yet.</td>
      </tr>
    `;
      return;
    }

    snapshots.forEach((snapshot) => {
      const savingClass = snapshot.saving >= 0 ? "green" : "red";
      const netCashFlowClass = snapshot.netCashFlow >= 0 ? "purple" : "red";

      const row = document.createElement("tr");

      row.innerHTML = `
      <td>${snapshot.month}</td>
      <td class="green">${formatHKD(snapshot.income)}</td>
      <td class="red">${formatHKD(snapshot.expense)}</td>
      <td class="blue">${formatHKD(snapshot.investment)}</td>
      <td class="${savingClass}">${formatHKD(snapshot.saving)}</td>
      <td class="${netCashFlowClass}">${formatHKD(snapshot.netCashFlow)}</td>
      <td>${snapshot.savingRate.toFixed(1)}%</td>
    `;

      analyticsMonthlyTableBody.appendChild(row);
    });
  }

  function renderAnalytics() {
    const analyticsSection = document.getElementById("analytics");

    if (!analyticsSection) return;

    populateAnalyticsMonthOptions();
    renderAnalyticsSummary();
    renderAnalyticsTrend();
    renderAnalyticsCategoryBreakdown();
    renderAnalyticsMonthlyTable();
  }

  function getBackupData() {
    return {
      app: "Permission to Save",
      version: "1.0",
      exportedAt: new Date().toISOString(),

      data: {
        transactions,
        budgets,
        savingGoals,
        subscriptions,
        settings,
        netWorthItems,
        investments,
        selectedMonth,
        planningMonths,
      },
    };
  }

  function getArrayCount(value) {
    return Array.isArray(value) ? value.length : 0;
  }

  function getObjectCount(value) {
    if (!value || Array.isArray(value) || typeof value !== "object") {
      return 0;
    }

    return Object.keys(value).length;
  }

  function getBackupSummaryText(data) {
    const backupSettings = data.settings || {};

    const summaryLines = [
      `Transactions: ${getArrayCount(data.transactions)}`,
      `Budget Categories: ${getObjectCount(data.budgets)}`,
      `Saving Goals: ${getArrayCount(data.savingGoals)}`,
      `Subscriptions: ${getArrayCount(data.subscriptions)}`,
      `Net Worth Items: ${getArrayCount(data.netWorthItems)}`,
      `Investments: ${getArrayCount(data.investments)}`,
      `Categories: ${getArrayCount(backupSettings.categories)}`,
      `Accounts: ${getArrayCount(backupSettings.accounts)}`,
      `Planning Months: ${getArrayCount(data.planningMonths)}`,
      `Selected Month: ${data.selectedMonth || getCurrentMonthString()}`,
    ];

    return summaryLines.join("\n");
  }

  function showBackupSummaryAlert(title, data) {
    alert(`${title}\n\n${getBackupSummaryText(data)}`);
  }

  function downloadJsonFile(data, filename) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  }

  function escapeCsvValue(value) {
    const stringValue = String(value ?? "");

    if (
      stringValue.includes(",") ||
      stringValue.includes('"') ||
      stringValue.includes("\n")
    ) {
      return `"${stringValue.replaceAll('"', '""')}"`;
    }

    return stringValue;
  }

  function convertRowsToCsv(headers, rows) {
    const headerRow = headers.map(escapeCsvValue).join(",");

    const dataRows = rows.map((row) => {
      return headers
        .map((header) => {
          return escapeCsvValue(row[header]);
        })
        .join(",");
    });

    return [headerRow, ...dataRows].join("\n");
  }

  function downloadCsvFile(fileName, csvText) {
    const blob = new Blob(["\uFEFF" + csvText], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportTransactionsCsv() {
    if (!transactions || transactions.length === 0) {
      showToast("No transactions to export.", "warning");
      return;
    }

    const headers = [
      "Date",
      "Type",
      "Description",
      "Category",
      "Account",
      "Amount",
      "Status",
      "Source",
      "Subscription ID",
    ];

    const rows = transactions.map((transaction) => {
      return {
        Date: transaction.date,
        Type: transaction.type,
        Description: transaction.description,
        Category: transaction.category,
        Account: transaction.account,
        Amount: transaction.amount,
        Status: transaction.status,
        Source: transaction.source || "",
        "Subscription ID": transaction.subscriptionId || "",
      };
    });

    const csvText = convertRowsToCsv(headers, rows);
    const today = getTodayDateString();

    downloadCsvFile(`permission-to-save-transactions-${today}.csv`, csvText);

    showToast("Transactions CSV exported successfully.", "success");
  }

  function exportMonthlySnapshotCsv() {
    const months = getAvailableMonths().sort();

    if (!months || months.length === 0) {
      showToast("No monthly snapshot data to export.", "warning");
      return;
    }

    const headers = [
      "Month",
      "Income",
      "Expense",
      "Investment",
      "Saving",
      "Net Cash Flow",
      "Saving Rate",
    ];

    const rows = months.map((month) => {
      const snapshot = calculateMonthlySnapshot(month);

      return {
        Month: snapshot.month,
        Income: snapshot.income,
        Expense: snapshot.expense,
        Investment: snapshot.investment,
        Saving: snapshot.saving,
        "Net Cash Flow": snapshot.netCashFlow,
        "Saving Rate": `${snapshot.savingRate.toFixed(1)}%`,
      };
    });

    const csvText = convertRowsToCsv(headers, rows);
    const today = getTodayDateString();

    downloadCsvFile(
      `permission-to-save-monthly-snapshot-${today}.csv`,
      csvText,
    );

    showToast("Monthly Snapshot CSV exported successfully.", "success");
  }

  function exportAppData() {
    const backupData = getBackupData();
    const today = getTodayDateString();

    downloadJsonFile(backupData, `permission-to-save-backup-${today}.json`);

    showToast("Backup exported successfully.", "success");

    showBackupSummaryAlert("Backup exported successfully.", backupData.data);
  }

  function normalizeItems(items) {
    if (!Array.isArray(items)) return [];

    return items.map((item) => ({
      ...item,
      id: item.id || createId(),
    }));
  }

  function normalizeSettings(importedSettings) {
    if (!importedSettings) {
      return defaultSettings;
    }

    return {
      categories: normalizeItems(importedSettings.categories || []),
      accounts: normalizeItems(importedSettings.accounts || []),
    };
  }

  function applyImportedData(importedData) {
    transactions = normalizeItems(importedData.transactions || []);
    budgets = normalizeBudgets(importedData.budgets || defaultBudgets);
    savingGoals = normalizeItems(importedData.savingGoals || []);
    subscriptions = normalizeItems(importedData.subscriptions || []);
    settings = normalizeSettings(importedData.settings);
    netWorthItems = normalizeItems(importedData.netWorthItems || []);
    investments = normalizeItems(importedData.investments || []);
    selectedMonth = importedData.selectedMonth || getCurrentMonthString();

    planningMonths = Array.isArray(importedData.planningMonths)
      ? importedData.planningMonths
      : [getCurrentMonthString()];

    if (!planningMonths.includes(selectedMonth)) {
      planningMonths.unshift(selectedMonth);
    }

    saveTransactions();
    saveBudgets();
    saveSavingGoals();
    saveSubscriptions();
    saveSettings();
    saveNetWorthItems();
    saveInvestments();
    saveSelectedMonth(selectedMonth);
    savePlanningMonths();

    renderSettings();
    populateTransactionDropdowns();

    renderTransactions();
    renderSavingGoals();
    renderSubscriptions();
    renderNetWorthTracking();
    renderInvestmentTracking();
    renderDashboard();
    renderAnalytics();
  }

  function importAppData(file) {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const parsedFile = JSON.parse(event.target.result);

        if (!parsedFile || !parsedFile.data) {
          showToast("Invalid backup file.", "error");
          return;
        }

        const confirmed = confirm(
          `Importing this backup will replace all current data.\n\nBackup content:\n${getBackupSummaryText(parsedFile.data)}\n\nDo you want to continue?`,
        );

        if (!confirmed) {
          showToast("Import cancelled.", "info");
          return;
        }

        applyImportedData(parsedFile.data);

        showToast("Backup imported successfully.", "success");

        showBackupSummaryAlert(
          "Backup imported successfully.",
          parsedFile.data,
        );
      } catch (error) {
        console.error(error);

        showToast(
          "Unable to import this file. Please check if it is a valid JSON backup.",
          "error",
        );
      }
    };

    reader.readAsText(file);
  }

  function resetAllAppData() {
    const firstConfirm = confirm(
      "This will delete all current saved data and restore default demo data. Continue?",
    );

    if (!firstConfirm) return;

    const secondConfirm = confirm(
      "Are you absolutely sure? This action cannot be undone unless you have exported a backup.",
    );

    if (!secondConfirm) return;

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BUDGET_STORAGE_KEY);
    localStorage.removeItem(GOALS_STORAGE_KEY);
    localStorage.removeItem(SUBSCRIPTION_STORAGE_KEY);
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    localStorage.removeItem(NET_WORTH_STORAGE_KEY);
    localStorage.removeItem(INVESTMENT_STORAGE_KEY);

    localStorage.removeItem(SELECTED_MONTH_STORAGE_KEY);
    localStorage.removeItem(PLANNING_MONTHS_STORAGE_KEY);

    transactions = loadTransactions();
    budgets = loadBudgets();
    savingGoals = loadSavingGoals();
    subscriptions = loadSubscriptions();
    settings = loadSettings();
    netWorthItems = loadNetWorthItems();
    investments = loadInvestments();

    renderSettings();
    populateTransactionDropdowns();

    syncMonthSelectors();

    renderTransactions();
    renderSavingGoals();
    renderSubscriptions();
    renderNetWorthTracking();
    renderInvestmentTracking();
    renderDashboard();
    renderAnalytics();

    showPage("dashboard");

    showToast("All data has been reset to default demo data.", "success");
  }

  function getShortMonthLabel(monthKey) {
    const date = new Date(`${monthKey}-01T00:00:00`);

    return date.toLocaleString("en-US", {
      month: "short",
    });
  }

  function populateAnalyticsMonthOptions() {
    const analyticsMonth = document.getElementById("analyticsMonth");

    if (!analyticsMonth) return;

    const currentValue = analyticsMonth.value;
    const months = getAvailableMonths();

    analyticsMonth.innerHTML = "";

    const fallbackMonth = getSelectedMonth();

    analyticsMonth.innerHTML = `
  <option value="${fallbackMonth}">${fallbackMonth}</option>
`;

    analyticsMonth.value = fallbackMonth;

    months.forEach((month) => {
      const option = document.createElement("option");
      option.value = month;
      option.textContent = month;
      analyticsMonth.appendChild(option);
    });

    analyticsMonth.value = months.includes(currentValue)
      ? currentValue
      : months[0];
  }

  function getAnalyticsSnapshots() {
    return getAvailableMonths()
      .sort()
      .map((month) => calculateMonthlySnapshot(month));
  }

  function calculateCategoryBreakdown(month) {
    const categoryMap = {};

    transactions.forEach((transaction) => {
      if (!transaction.date) return;
      if (transaction.status !== "Completed") return;
      if (transaction.type !== "Expense") return;
      if (transaction.category === "Investment") return;

      const transactionMonth = getTransactionMonth(transaction.date);

      if (transactionMonth !== month) return;

      const category = transaction.category || "Others";

      if (!categoryMap[category]) {
        categoryMap[category] = {
          category,
          amount: 0,
          count: 0,
        };
      }

      categoryMap[category].amount += Number(transaction.amount);
      categoryMap[category].count += 1;
    });

    const breakdown = Object.values(categoryMap).sort(
      (a, b) => b.amount - a.amount,
    );

    const total = breakdown.reduce((sum, item) => {
      return sum + item.amount;
    }, 0);

    return {
      breakdown,
      total,
    };
  }

  function renderAnalyticsSummary() {
    const analyticsBestSavingMonth = document.getElementById(
      "analyticsBestSavingMonth",
    );
    const analyticsAverageExpense = document.getElementById(
      "analyticsAverageExpense",
    );
    const analyticsAverageSavingRate = document.getElementById(
      "analyticsAverageSavingRate",
    );
    const analyticsTopCategory = document.getElementById(
      "analyticsTopCategory",
    );
    const analyticsMonth = document.getElementById("analyticsMonth");

    if (
      !analyticsBestSavingMonth ||
      !analyticsAverageExpense ||
      !analyticsAverageSavingRate ||
      !analyticsTopCategory ||
      !analyticsMonth
    ) {
      return;
    }

    const snapshots = getAnalyticsSnapshots();

    if (snapshots.length === 0) {
      analyticsBestSavingMonth.textContent = "-";
      analyticsAverageExpense.textContent = formatHKD(0);
      analyticsAverageSavingRate.textContent = "0%";
      analyticsTopCategory.textContent = "-";
      return;
    }

    const bestSavingSnapshot = [...snapshots].sort(
      (a, b) => b.saving - a.saving,
    )[0];

    const averageExpense =
      snapshots.reduce((sum, snapshot) => sum + snapshot.expense, 0) /
      snapshots.length;

    const averageSavingRate =
      snapshots.reduce((sum, snapshot) => sum + snapshot.savingRate, 0) /
      snapshots.length;

    const selectedMonth = analyticsMonth.value;
    const categoryData = calculateCategoryBreakdown(selectedMonth);
    const topCategory = categoryData.breakdown[0];

    analyticsBestSavingMonth.textContent = bestSavingSnapshot.month;
    analyticsAverageExpense.textContent = formatHKD(averageExpense);
    analyticsAverageSavingRate.textContent = `${averageSavingRate.toFixed(1)}%`;
    analyticsTopCategory.textContent = topCategory ? topCategory.category : "-";
  }

  function renderAnalyticsTrend() {
    const analyticsTrendBars = document.getElementById("analyticsTrendBars");

    if (!analyticsTrendBars) return;

    const snapshots = getAnalyticsSnapshots();

    analyticsTrendBars.innerHTML = "";

    if (snapshots.length === 0) {
      analyticsTrendBars.innerHTML = `
      <div class="analytics-empty">
        No monthly data yet.
      </div>
    `;
      return;
    }

    const maxValue = Math.max(
      ...snapshots.map((snapshot) => snapshot.income),
      ...snapshots.map((snapshot) => snapshot.expense),
      ...snapshots.map((snapshot) => Math.abs(snapshot.saving)),
      1,
    );

    snapshots.forEach((snapshot) => {
      const incomeHeight = (snapshot.income / maxValue) * 100;
      const expenseHeight = (snapshot.expense / maxValue) * 100;
      const savingHeight = (Math.abs(snapshot.saving) / maxValue) * 100;

      const monthGroup = document.createElement("div");
      monthGroup.className = "analytics-month-group";

      monthGroup.innerHTML = `
      <div class="analytics-bars-set">
        <div
          class="analytics-bar income"
          style="height:${incomeHeight}%"
          title="Income: ${formatHKD(snapshot.income)}"
        ></div>

        <div
          class="analytics-bar expense"
          style="height:${expenseHeight}%"
          title="Expense: ${formatHKD(snapshot.expense)}"
        ></div>

        <div
          class="analytics-bar saving"
          style="height:${savingHeight}%"
          title="Saving: ${formatHKD(snapshot.saving)}"
        ></div>
      </div>

      <span class="analytics-month-label">${getShortMonthLabel(snapshot.month)}</span>
    `;

      analyticsTrendBars.appendChild(monthGroup);
    });
  }

  function renderAnalyticsCategoryBreakdown() {
    const analyticsCategoryBreakdown = document.getElementById(
      "analyticsCategoryBreakdown",
    );
    const analyticsMonth = document.getElementById("analyticsMonth");

    if (!analyticsCategoryBreakdown || !analyticsMonth) return;

    const selectedMonth = analyticsMonth.value;
    const categoryData = calculateCategoryBreakdown(selectedMonth);

    analyticsCategoryBreakdown.innerHTML = "";

    if (categoryData.breakdown.length === 0) {
      analyticsCategoryBreakdown.innerHTML = `
      <div class="analytics-empty">
        No completed expense records for this month.
      </div>
    `;
      return;
    }

    categoryData.breakdown.forEach((item) => {
      const percentage =
        categoryData.total > 0 ? (item.amount / categoryData.total) * 100 : 0;

      const row = document.createElement("div");
      row.className = "analytics-category-item";

      row.innerHTML = `
      <div class="analytics-category-top">
        <strong>${item.category}</strong>
        <span class="red">${formatHKD(item.amount)}</span>
      </div>

      <div class="budget-usage-bar">
        <span style="width:${Math.min(percentage, 100)}%"></span>
      </div>

      <div class="analytics-category-meta">
        ${item.count} transaction${item.count > 1 ? "s" : ""} · ${percentage.toFixed(0)}%
      </div>
    `;

      analyticsCategoryBreakdown.appendChild(row);
    });
  }

  function renderAnalyticsMonthlyTable() {
    const analyticsMonthlyTableBody = document.getElementById(
      "analyticsMonthlyTableBody",
    );

    if (!analyticsMonthlyTableBody) return;

    const snapshots = getAnalyticsSnapshots().sort((a, b) => {
      return b.month.localeCompare(a.month);
    });

    analyticsMonthlyTableBody.innerHTML = "";

    if (snapshots.length === 0) {
      analyticsMonthlyTableBody.innerHTML = `
      <tr>
        <td colspan="7">No monthly performance data yet.</td>
      </tr>
    `;
      return;
    }

    snapshots.forEach((snapshot) => {
      const savingClass = snapshot.saving >= 0 ? "green" : "red";
      const netCashFlowClass = snapshot.netCashFlow >= 0 ? "purple" : "red";

      const row = document.createElement("tr");

      row.innerHTML = `
      <td>${snapshot.month}</td>
      <td class="green">${formatHKD(snapshot.income)}</td>
      <td class="red">${formatHKD(snapshot.expense)}</td>
      <td class="blue">${formatHKD(snapshot.investment)}</td>
      <td class="${savingClass}">${formatHKD(snapshot.saving)}</td>
      <td class="${netCashFlowClass}">${formatHKD(snapshot.netCashFlow)}</td>
      <td>${snapshot.savingRate.toFixed(1)}%</td>
    `;

      analyticsMonthlyTableBody.appendChild(row);
    });
  }

  function renderAnalytics() {
    const analyticsSection = document.getElementById("analytics");

    if (!analyticsSection) return;

    populateAnalyticsMonthOptions();
    renderAnalyticsSummary();
    renderAnalyticsTrend();
    renderAnalyticsCategoryBreakdown();
    renderAnalyticsMonthlyTable();
  }

  // =========================
  // EVENT LISTENERS
  // =========================

  const openTransactionModalBtn = document.getElementById(
    "openTransactionModal",
  );
  const closeTransactionModalBtn = document.getElementById(
    "closeTransactionModal",
  );
  const cancelTransactionModalBtn = document.getElementById(
    "cancelTransactionModal",
  );
  const transactionModal = document.getElementById("transactionModal");
  const transactionForm = document.getElementById("transactionForm");
  const transactionTableBody = document.getElementById("transactionTableBody");
  const transactionSearch = document.getElementById("transactionSearch");
  const categoryFilter = document.getElementById("categoryFilter");
  const transactionTypeSelect = document.getElementById("transactionType");

  if (openTransactionModalBtn) {
    openTransactionModalBtn.addEventListener("click", openTransactionModal);
  }

  if (closeTransactionModalBtn) {
    closeTransactionModalBtn.addEventListener("click", closeTransactionModal);
  }

  if (cancelTransactionModalBtn) {
    cancelTransactionModalBtn.addEventListener("click", closeTransactionModal);
  }

  if (transactionModal) {
    transactionModal.addEventListener("click", (event) => {
      if (event.target === transactionModal) {
        closeTransactionModal();
      }
    });
  }

  if (transactionTypeSelect) {
    transactionTypeSelect.addEventListener("change", () => {
      populateTransactionDropdowns({
        preserveCategory: false,
        preserveAccount: true,
      });
    });
  }

  if (transactionForm) {
    transactionForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const formData = validateTransactionForm();

      if (!formData) return;

      const isEditingTransaction = Boolean(editingTransactionId);

      let syncedTransaction = null;

      if (editingTransactionId) {
        transactions = transactions.map((transaction) => {
          if (transaction.id === editingTransactionId) {
            syncedTransaction = {
              ...transaction,
              ...formData,
            };

            return syncedTransaction;
          }

          return transaction;
        });
      } else {
        syncedTransaction = {
          id: createId(),
          ...formData,
        };

        transactions.unshift(syncedTransaction);
      }

      saveTransactions();
      renderTransactions();
      closeTransactionModal();

      showToast(
        isEditingTransaction
          ? "Transaction updated successfully."
          : "Transaction added successfully.",
        "success",
      );

      upsertTransactionToCloud(syncedTransaction);
    });
  }

  if (transactionTableBody) {
    transactionTableBody.addEventListener("click", (event) => {
      const editButton = event.target.closest(".edit-transaction-btn");
      const deleteButton = event.target.closest(".delete-transaction-btn");

      if (editButton) {
        openEditTransactionModal(editButton.dataset.id);
        return;
      }

      if (deleteButton) {
        deleteTransaction(deleteButton.dataset.id);
      }
    });
  }

  const typeFilter = document.getElementById("typeFilter");
  const statusFilter = document.getElementById("statusFilter");
  const monthFilter = document.getElementById("monthFilter");
  const clearTransactionFiltersBtn = document.getElementById(
    "clearTransactionFiltersBtn",
  );

  if (transactionSearch) {
    transactionSearch.addEventListener("input", filterTransactions);
  }

  if (categoryFilter) {
    categoryFilter.addEventListener("change", filterTransactions);
  }

  if (typeFilter) {
    typeFilter.addEventListener("change", filterTransactions);
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", filterTransactions);
  }

  if (monthFilter) {
    monthFilter.addEventListener("change", filterTransactions);
  }

  if (clearTransactionFiltersBtn) {
    clearTransactionFiltersBtn.addEventListener("click", () => {
      if (transactionSearch) transactionSearch.value = "";
      if (categoryFilter) categoryFilter.value = "All Categories";
      if (typeFilter) typeFilter.value = "All Types";
      if (statusFilter) statusFilter.value = "All Statuses";
      if (monthFilter) monthFilter.value = "All Months";

      filterTransactions();

      showToast("Transaction filters cleared.", "info");
    });
  }

  const monthlySnapshotMonth = document.getElementById("monthlySnapshotMonth");

  const analyticsMonth = document.getElementById("analyticsMonth");

  if (analyticsMonth) {
    analyticsMonth.addEventListener("change", renderAnalytics);
  }

  const exportDataBtn = document.getElementById("exportDataBtn");
  const sendLoginLinkBtn = document.getElementById("sendLoginLinkBtn");
  const logoutCloudBtn = document.getElementById("logoutCloudBtn");

  const uploadTransactionsCloudBtn = document.getElementById(
    "uploadTransactionsCloudBtn",
  );
  const loadTransactionsCloudBtn = document.getElementById(
    "loadTransactionsCloudBtn",
  );

  const uploadBudgetsCloudBtn = document.getElementById(
    "uploadBudgetsCloudBtn",
  );
  const uploadSavingGoalsCloudBtn = document.getElementById(
    "uploadSavingGoalsCloudBtn",
  );
  const uploadSubscriptionsCloudBtn = document.getElementById(
    "uploadSubscriptionsCloudBtn",
  );
  const uploadSettingsCloudBtn = document.getElementById(
    "uploadSettingsCloudBtn",
  );
  const uploadNetWorthCloudBtn = document.getElementById(
    "uploadNetWorthCloudBtn",
  );
  const uploadInvestmentsCloudBtn = document.getElementById(
    "uploadInvestmentsCloudBtn",
  );
  const uploadAllCloudBtn = document.getElementById("uploadAllCloudBtn");
  const loadAllCloudBtn = document.getElementById("loadAllCloudBtn");
  const loadInvestmentsCloudBtn = document.getElementById(
    "loadInvestmentsCloudBtn",
  );
  const loadNetWorthCloudBtn = document.getElementById("loadNetWorthCloudBtn");
  const loadSettingsCloudBtn = document.getElementById("loadSettingsCloudBtn");
  const loadSubscriptionsCloudBtn = document.getElementById(
    "loadSubscriptionsCloudBtn",
  );
  const loadSavingGoalsCloudBtn = document.getElementById(
    "loadSavingGoalsCloudBtn",
  );
  const loadBudgetsCloudBtn = document.getElementById("loadBudgetsCloudBtn");

  if (sendLoginLinkBtn) {
    sendLoginLinkBtn.addEventListener("click", sendCloudLoginLink);
  }

  if (logoutCloudBtn) {
    logoutCloudBtn.addEventListener("click", logoutCloudAccount);
  }

  if (uploadTransactionsCloudBtn) {
    uploadTransactionsCloudBtn.addEventListener(
      "click",
      uploadTransactionsToCloud,
    );
  }

  if (loadTransactionsCloudBtn) {
    loadTransactionsCloudBtn.addEventListener(
      "click",
      loadTransactionsFromCloud,
    );
  }

  if (uploadBudgetsCloudBtn) {
    uploadBudgetsCloudBtn.addEventListener("click", uploadBudgetsToCloud);
  }

  if (loadBudgetsCloudBtn) {
    loadBudgetsCloudBtn.addEventListener("click", loadBudgetsFromCloud);
  }

  if (uploadSavingGoalsCloudBtn) {
    uploadSavingGoalsCloudBtn.addEventListener(
      "click",
      uploadSavingGoalsToCloud,
    );
  }

  if (loadSavingGoalsCloudBtn) {
    loadSavingGoalsCloudBtn.addEventListener("click", loadSavingGoalsFromCloud);
  }

  if (uploadSubscriptionsCloudBtn) {
    uploadSubscriptionsCloudBtn.addEventListener(
      "click",
      uploadSubscriptionsToCloud,
    );
  }

  if (loadSubscriptionsCloudBtn) {
    loadSubscriptionsCloudBtn.addEventListener(
      "click",
      loadSubscriptionsFromCloud,
    );
  }

  if (uploadSettingsCloudBtn) {
    uploadSettingsCloudBtn.addEventListener("click", uploadSettingsToCloud);
  }

  if (loadSettingsCloudBtn) {
    loadSettingsCloudBtn.addEventListener("click", loadSettingsFromCloud);
  }

  if (uploadNetWorthCloudBtn) {
    uploadNetWorthCloudBtn.addEventListener("click", uploadNetWorthToCloud);
  }

  if (loadNetWorthCloudBtn) {
    loadNetWorthCloudBtn.addEventListener("click", loadNetWorthFromCloud);
  }

  if (uploadInvestmentsCloudBtn) {
    uploadInvestmentsCloudBtn.addEventListener(
      "click",
      uploadInvestmentsToCloud,
    );
  }

  if (loadInvestmentsCloudBtn) {
    loadInvestmentsCloudBtn.addEventListener("click", loadInvestmentsFromCloud);
  }

  if (uploadAllCloudBtn) {
    uploadAllCloudBtn.addEventListener("click", uploadAllDataToCloud);
  }

  if (loadAllCloudBtn) {
    loadAllCloudBtn.addEventListener("click", loadAllDataFromCloud);
  }

  const exportTransactionsCsvBtn = document.getElementById(
    "exportTransactionsCsvBtn",
  );
  const exportMonthlySnapshotCsvBtn = document.getElementById(
    "exportMonthlySnapshotCsvBtn",
  );
  const importDataBtn = document.getElementById("importDataBtn");
  const importDataInput = document.getElementById("importDataInput");
  const resetDataBtn = document.getElementById("resetDataBtn");

  const themeToggleBtn = document.getElementById("themeToggleBtn");

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
  }

  const mobileMenuBtn = document.getElementById("mobileMenuBtn");

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener("click", toggleMobileMenu);
  }

  window.addEventListener("resize", () => {
    if (window.innerWidth > 860 && sidebarPanel) {
      sidebarPanel.classList.remove("mobile-open");
      updateMobileMenuButton();
    }
  });

  if (exportDataBtn) {
    exportDataBtn.addEventListener("click", exportAppData);
  }

  if (exportTransactionsCsvBtn) {
    exportTransactionsCsvBtn.addEventListener("click", exportTransactionsCsv);
  }

  if (exportMonthlySnapshotCsvBtn) {
    exportMonthlySnapshotCsvBtn.addEventListener(
      "click",
      exportMonthlySnapshotCsv,
    );
  }

  if (importDataBtn && importDataInput) {
    importDataBtn.addEventListener("click", () => {
      importDataInput.click();
    });
  }

  if (importDataInput) {
    importDataInput.addEventListener("change", (event) => {
      const file = event.target.files[0];

      if (!file) return;

      importAppData(file);

      event.target.value = "";
    });
  }

  if (resetDataBtn) {
    resetDataBtn.addEventListener("click", resetAllAppData);
  }

  if (monthlySnapshotMonth) {
    monthlySnapshotMonth.addEventListener("change", (event) => {
      setSelectedMonth(event.target.value);
    });
  }

  const globalSelectedMonth = document.getElementById("globalSelectedMonth");

  if (globalSelectedMonth) {
    globalSelectedMonth.addEventListener("change", (event) => {
      setSelectedMonth(event.target.value);
    });
  }

  const moneyFlowSegmented = document.getElementById("moneyFlowSegmented");

  if (moneyFlowSegmented) {
    moneyFlowSegmented.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-flow-view]");

      if (!button) return;

      setMoneyFlowView(button.dataset.flowView);
    });
  }

  const topSpendingList = document.getElementById("topSpendingList");

  if (topSpendingList) {
    topSpendingList.addEventListener("click", (event) => {
      const clickedItem = event.target.closest(".top-spending-item");

      if (!clickedItem) return;

      goToTransactionsWithCategory(clickedItem.dataset.topSpendingCategory);
    });

    topSpendingList.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;

      const focusedItem = event.target.closest(".top-spending-item");

      if (!focusedItem) return;

      event.preventDefault();
      goToTransactionsWithCategory(focusedItem.dataset.topSpendingCategory);
    });
  }

  const dashboardRecentTransactionsBody = document.getElementById(
    "dashboardRecentTransactionsBody",
  );

  if (dashboardRecentTransactionsBody) {
    dashboardRecentTransactionsBody.addEventListener("click", (event) => {
      const clickedRow = event.target.closest(
        "tr[data-dashboard-transaction-id]",
      );

      if (!clickedRow) return;

      goToTransactionFromDashboard(clickedRow.dataset.dashboardTransactionId);
    });

    dashboardRecentTransactionsBody.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;

      const focusedRow = event.target.closest(
        "tr[data-dashboard-transaction-id]",
      );

      if (!focusedRow) return;

      event.preventDefault();
      goToTransactionFromDashboard(focusedRow.dataset.dashboardTransactionId);
    });
  }

  const addPlanningMonthBtn = document.getElementById("addPlanningMonthBtn");

  if (addPlanningMonthBtn) {
    addPlanningMonthBtn.addEventListener("click", addPlanningMonth);
  }

  const budgetPlannerMonth = document.getElementById("budgetPlannerMonth");
  const saveBudgetBtn = document.getElementById("saveBudgetBtn");

  const copyPreviousBudgetBtn = document.getElementById(
    "copyPreviousBudgetBtn",
  );

  if (copyPreviousBudgetBtn) {
    copyPreviousBudgetBtn.addEventListener("click", copyPreviousMonthBudget);
  }

  if (budgetPlannerMonth) {
    budgetPlannerMonth.addEventListener("change", (event) => {
      setSelectedMonth(event.target.value);
    });
  }

  if (saveBudgetBtn) {
    saveBudgetBtn.addEventListener("click", saveBudgetInputs);
  }

  const goToDashboardBtn = document.getElementById("goToDashboardBtn");
  const goToTransactionsBtn = document.getElementById("goToTransactionsBtn");
  const goToAnalyticsBtn = document.getElementById("goToAnalyticsBtn");

  const goToSavingGoalsBtn = document.getElementById("goToSavingGoalsBtn");
  const goToSubscriptionsBtn = document.getElementById("goToSubscriptionsBtn");
  const goToNetWorthBtn = document.getElementById("goToNetWorthBtn");
  const goToInvestmentBtn = document.getElementById("goToInvestmentBtn");

  if (goToInvestmentBtn) {
    goToInvestmentBtn.addEventListener("click", () => {
      showPage("investment-tracking");
    });
  }

  if (goToNetWorthBtn) {
    goToNetWorthBtn.addEventListener("click", () => {
      showPage("net-worth-tracking");
    });
  }

  if (goToSubscriptionsBtn) {
    goToSubscriptionsBtn.addEventListener("click", () => {
      showPage("subscription-tracking");
    });
  }

  const openInvestmentModalBtn = document.getElementById("openInvestmentModal");
  const closeInvestmentModalBtn = document.getElementById(
    "closeInvestmentModal",
  );
  const cancelInvestmentModalBtn = document.getElementById(
    "cancelInvestmentModal",
  );
  const investmentModal = document.getElementById("investmentModal");
  const investmentForm = document.getElementById("investmentForm");
  const investmentTableBody = document.getElementById("investmentTableBody");

  if (openInvestmentModalBtn) {
    openInvestmentModalBtn.addEventListener("click", openInvestmentModal);
  }

  if (closeInvestmentModalBtn) {
    closeInvestmentModalBtn.addEventListener("click", closeInvestmentModal);
  }

  if (cancelInvestmentModalBtn) {
    cancelInvestmentModalBtn.addEventListener("click", closeInvestmentModal);
  }

  if (investmentModal) {
    investmentModal.addEventListener("click", (event) => {
      if (event.target === investmentModal) {
        closeInvestmentModal();
      }
    });
  }

  if (investmentForm) {
    investmentForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const formData = validateInvestmentForm();

      if (!formData) return;

      const isEditingInvestment = Boolean(editingInvestmentId);

      let syncedInvestment = null;

      if (editingInvestmentId) {
        investments = investments.map((investment) => {
          if (investment.id === editingInvestmentId) {
            syncedInvestment = {
              ...investment,
              ...formData,
            };

            return syncedInvestment;
          }

          return investment;
        });
      } else {
        syncedInvestment = {
          id: createId(),
          ...formData,
        };

        investments.unshift(syncedInvestment);
      }

      saveInvestments();
      renderInvestmentTracking();
      renderDashboard();
      closeInvestmentModal();

      showToast(
        isEditingInvestment
          ? "Investment updated successfully."
          : "Investment added successfully.",
        "success",
      );

      upsertInvestmentToCloud(syncedInvestment);
    });
  }

  if (investmentTableBody) {
    investmentTableBody.addEventListener("click", (event) => {
      const editButton = event.target.closest(".edit-investment-btn");
      const deleteButton = event.target.closest(".delete-investment-btn");

      if (editButton) {
        openEditInvestmentModal(editButton.dataset.id);
        return;
      }

      if (deleteButton) {
        deleteInvestment(deleteButton.dataset.id);
      }
    });
  }

  const openNetWorthModalBtn = document.getElementById("openNetWorthModal");
  const closeNetWorthModalBtn = document.getElementById("closeNetWorthModal");
  const cancelNetWorthModalBtn = document.getElementById("cancelNetWorthModal");
  const netWorthModal = document.getElementById("netWorthModal");
  const netWorthForm = document.getElementById("netWorthForm");
  const netWorthTableBody = document.getElementById("netWorthTableBody");

  if (openNetWorthModalBtn) {
    openNetWorthModalBtn.addEventListener("click", openNetWorthModal);
  }

  if (closeNetWorthModalBtn) {
    closeNetWorthModalBtn.addEventListener("click", closeNetWorthModal);
  }

  if (cancelNetWorthModalBtn) {
    cancelNetWorthModalBtn.addEventListener("click", closeNetWorthModal);
  }

  if (netWorthModal) {
    netWorthModal.addEventListener("click", (event) => {
      if (event.target === netWorthModal) {
        closeNetWorthModal();
      }
    });
  }

  if (netWorthForm) {
    netWorthForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const formData = validateNetWorthForm();

      if (!formData) return;

      const isEditingNetWorth = Boolean(editingNetWorthId);

      let syncedNetWorthItem = null;

      if (editingNetWorthId) {
        netWorthItems = netWorthItems.map((item) => {
          if (item.id === editingNetWorthId) {
            syncedNetWorthItem = {
              ...item,
              ...formData,
            };

            return syncedNetWorthItem;
          }

          return item;
        });
      } else {
        syncedNetWorthItem = {
          id: createId(),
          ...formData,
        };

        netWorthItems.unshift(syncedNetWorthItem);
      }

      saveNetWorthItems();
      renderNetWorthTracking();
      renderDashboard();
      closeNetWorthModal();

      showToast(
        isEditingNetWorth
          ? "Net worth item updated successfully."
          : "Net worth item added successfully.",
        "success",
      );

      upsertNetWorthItemToCloud(syncedNetWorthItem);
    });
  }

  if (netWorthTableBody) {
    netWorthTableBody.addEventListener("click", (event) => {
      const editButton = event.target.closest(".edit-networth-btn");
      const deleteButton = event.target.closest(".delete-networth-btn");

      if (editButton) {
        openEditNetWorthModal(editButton.dataset.id);
        return;
      }

      if (deleteButton) {
        deleteNetWorthItem(deleteButton.dataset.id);
      }
    });
  }

  if (goToSavingGoalsBtn) {
    goToSavingGoalsBtn.addEventListener("click", () => {
      showPage("saving-goals");
    });
  }

  if (goToDashboardBtn) {
    goToDashboardBtn.addEventListener("click", () => {
      showPage("dashboard");
    });
  }

  if (goToTransactionsBtn) {
    goToTransactionsBtn.addEventListener("click", () => {
      showPage("transactions");
    });
  }

  if (goToAnalyticsBtn) {
    goToAnalyticsBtn.addEventListener("click", () => {
      showPage("analytics");
    });
  }

  const openSavingGoalModalBtn = document.getElementById("openSavingGoalModal");
  const closeSavingGoalModalBtn = document.getElementById(
    "closeSavingGoalModal",
  );
  const cancelSavingGoalModalBtn = document.getElementById(
    "cancelSavingGoalModal",
  );
  const savingGoalModal = document.getElementById("savingGoalModal");
  const savingGoalForm = document.getElementById("savingGoalForm");
  const savingGoalsList = document.getElementById("savingGoalsList");

  if (openSavingGoalModalBtn) {
    openSavingGoalModalBtn.addEventListener("click", openSavingGoalModal);
  }

  if (closeSavingGoalModalBtn) {
    closeSavingGoalModalBtn.addEventListener("click", closeSavingGoalModal);
  }

  if (cancelSavingGoalModalBtn) {
    cancelSavingGoalModalBtn.addEventListener("click", closeSavingGoalModal);
  }

  if (savingGoalModal) {
    savingGoalModal.addEventListener("click", (event) => {
      if (event.target === savingGoalModal) {
        closeSavingGoalModal();
      }
    });
  }

  if (savingGoalForm) {
    savingGoalForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const formData = validateSavingGoalForm();

      if (!formData) return;

      const isEditingGoal = Boolean(editingGoalId);

      let syncedSavingGoal = null;

      if (editingGoalId) {
        savingGoals = savingGoals.map((goal) => {
          if (goal.id === editingGoalId) {
            syncedSavingGoal = {
              ...goal,
              ...formData,
            };

            return syncedSavingGoal;
          }

          return goal;
        });
      } else {
        syncedSavingGoal = {
          id: createId(),
          ...formData,
        };

        savingGoals.unshift(syncedSavingGoal);
      }

      saveSavingGoals();
      renderSavingGoals();
      renderDashboard();
      closeSavingGoalModal();

      showToast(
        isEditingGoal
          ? "Saving goal updated successfully."
          : "Saving goal added successfully.",
        "success",
      );

      upsertSavingGoalToCloud(syncedSavingGoal);
    });
  }

  if (savingGoalsList) {
    savingGoalsList.addEventListener("click", (event) => {
      const editButton = event.target.closest(".edit-goal-btn");
      const deleteButton = event.target.closest(".delete-goal-btn");

      if (editButton) {
        openEditSavingGoalModal(editButton.dataset.id);
        return;
      }

      if (deleteButton) {
        deleteSavingGoal(deleteButton.dataset.id);
      }
    });
  }

  const openSubscriptionModalBtn = document.getElementById(
    "openSubscriptionModal",
  );
  const closeSubscriptionModalBtn = document.getElementById(
    "closeSubscriptionModal",
  );
  const cancelSubscriptionModalBtn = document.getElementById(
    "cancelSubscriptionModal",
  );
  const subscriptionModal = document.getElementById("subscriptionModal");
  const subscriptionForm = document.getElementById("subscriptionForm");
  const subscriptionTableBody = document.getElementById(
    "subscriptionTableBody",
  );

  if (openSubscriptionModalBtn) {
    openSubscriptionModalBtn.addEventListener("click", openSubscriptionModal);
  }

  if (closeSubscriptionModalBtn) {
    closeSubscriptionModalBtn.addEventListener("click", closeSubscriptionModal);
  }

  if (cancelSubscriptionModalBtn) {
    cancelSubscriptionModalBtn.addEventListener(
      "click",
      closeSubscriptionModal,
    );
  }

  if (subscriptionModal) {
    subscriptionModal.addEventListener("click", (event) => {
      if (event.target === subscriptionModal) {
        closeSubscriptionModal();
      }
    });
  }

  if (subscriptionForm) {
    subscriptionForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const formData = validateSubscriptionForm();

      if (!formData) return;

      const isEditingSubscription = Boolean(editingSubscriptionId);

      let syncedSubscription = null;

      if (editingSubscriptionId) {
        subscriptions = subscriptions.map((subscription) => {
          if (subscription.id === editingSubscriptionId) {
            syncedSubscription = {
              ...subscription,
              ...formData,
            };

            return syncedSubscription;
          }

          return subscription;
        });
      } else {
        syncedSubscription = {
          id: createId(),
          ...formData,
        };

        subscriptions.unshift(syncedSubscription);
      }

      saveSubscriptions();
      renderSubscriptions();
      renderDashboard();
      closeSubscriptionModal();

      showToast(
        isEditingSubscription
          ? "Subscription updated successfully."
          : "Subscription added successfully.",
        "success",
      );

      upsertSubscriptionToCloud(syncedSubscription);
    });
  }

  if (subscriptionTableBody) {
    subscriptionTableBody.addEventListener("click", (event) => {
      const generateButton = event.target.closest(
        ".generate-subscription-transaction-btn",
      );
      const editButton = event.target.closest(".edit-subscription-btn");
      const deleteButton = event.target.closest(".delete-subscription-btn");

      if (generateButton) {
        generateTransactionFromSubscription(generateButton.dataset.id);
        return;
      }

      if (editButton) {
        openEditSubscriptionModal(editButton.dataset.id);
        return;
      }

      if (deleteButton) {
        deleteSubscription(deleteButton.dataset.id);
      }
    });
  }

  const categoryForm = document.getElementById("categoryForm");
  const accountForm = document.getElementById("accountForm");
  const categoryList = document.getElementById("categoryList");
  const accountList = document.getElementById("accountList");

  if (categoryForm) {
    categoryForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const formData = validateCategoryForm();

      if (!formData) return;

      const newCategory = {
        id: createId(),
        ...formData,
      };

      settings.categories.push(newCategory);

      saveSettings();
      renderSettings();
      populateTransactionDropdowns();
      renderBudgetPlanner();
      renderDashboard();
      clearFormError(categoryForm);
      categoryForm.reset();

      showToast("Category added successfully.", "success");

      upsertSettingItemToCloud("category", newCategory);
    });
  }

  if (accountForm) {
    accountForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const formData = validateAccountForm();

      if (!formData) return;

      const newAccount = {
        id: createId(),
        ...formData,
      };

      settings.accounts.push(newAccount);

      saveSettings();
      renderSettings();
      populateTransactionDropdowns();
      clearFormError(accountForm);
      accountForm.reset();

      showToast("Account added successfully.", "success");

      upsertSettingItemToCloud("account", newAccount);
    });
  }

  if (categoryList) {
    categoryList.addEventListener("click", (event) => {
      const editButton = event.target.closest(".edit-category-btn");

      if (editButton) {
        editCategory(editButton.dataset.id);
        return;
      }

      const deleteButton = event.target.closest(".delete-category-btn");

      if (deleteButton) {
        deleteCategory(deleteButton.dataset.id);
      }
    });
  }

  if (accountList) {
    accountList.addEventListener("click", (event) => {
      const editButton = event.target.closest(".edit-account-btn");

      if (editButton) {
        editAccount(editButton.dataset.id);
        return;
      }

      const deleteButton = event.target.closest(".delete-account-btn");

      if (deleteButton) {
        deleteAccount(deleteButton.dataset.id);
      }
    });
  }

  const segmentedButtons = document.querySelectorAll(".segmented button");

  segmentedButtons.forEach((button) => {
    button.addEventListener("click", () => {
      segmentedButtons.forEach((btn) => btn.classList.remove("selected"));
      button.classList.add("selected");
    });
  });

  // =========================
  // INITIAL RENDER
  // =========================

  applyTheme(getSavedTheme());
  updateMobileMenuButton();
  syncMonthSelectors();

  initializeCloudAuth();

  showPage("dashboard");

  renderSettings();
  populateTransactionDropdowns();

  renderTransactions();
  renderSavingGoals();
  renderSubscriptions();
  renderNetWorthTracking();
  renderInvestmentTracking();
  renderDashboard();
  renderAnalytics();

  if (window.lucide) {
    lucide.createIcons();
  }
});
