import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { EMAILJS_CONFIG, SUPABASE_CONFIG } from "./config.js";

// const link = document.createElement("link");
// link.rel = "stylesheet";
// link.href = "dashboard.css";
// document.head.appendChild(link);

const currentPage = window.location.pathname.split("/").pop();

  if (
    currentPage === "index.html" ||
    currentPage === "" ||
    currentPage === "dashboard.html"
  ) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "dashboard.css";
    document.head.appendChild(link);
  }

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

let roleState = { isAdmin: false, isSuperAdmin: false };

function hasInlineDashboardViews() {
  return Boolean(
    document.getElementById("transaction-details-view") ||
      document.getElementById("transaction-status-view")
  );
}

function switchDashboardView(view) {
  if (view === "queue" && !(roleState.isAdmin || roleState.isSuperAdmin)) {
    switchDashboardView("services");
    return;
  }

  const viewMap = {
    queue: "dashboard-view",
    reports: "reports-view",
    services: "services-view",
    "services-list": "services-list-view",
    accounts: "accounts-view",
    form: "form-view",
    "transaction-details": "transaction-details-view",
    "transaction-status": "transaction-status-view",
  };

  const targetId = viewMap[view];
  if (!targetId) {
    console.warn("[TxStatus] switchDashboardView: unknown view", view);
    return;
  }
  const targetEl = document.getElementById(targetId);
  if (!targetEl) {
    console.error("[TxStatus] switchDashboardView: target element not found", { view, targetId });
    return;
  }
  const activeClass = "view-panel--active";
  Object.values(viewMap).forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      if (id === targetId) {
        el.classList.add(activeClass);
        if (view === "transaction-status") {
          console.log("[TxStatus] switchDashboardView: showing transaction-status-view", {
            hasActiveClass: el.classList.contains(activeClass),
            display: getComputedStyle(el).display,
          });
        }
      } else {
        el.classList.remove(activeClass);
      }
    }
  });

  const navQueue = document.getElementById("nav-queue");
  const navReports = document.getElementById("nav-reports");
  const navServices = document.getElementById("nav-services");
  const navServicesList = document.getElementById("nav-services-list");
  const navAccounts = document.getElementById("nav-accounts");
  [navQueue, navReports, navServices, navServicesList, navAccounts].forEach(
    (nav) => {
      if (nav) nav.classList.remove("active");
    }
  );

  if (view === "queue" && navQueue) navQueue.classList.add("active");
  if (view === "reports" && navReports) navReports.classList.add("active");
  if (view === "services" && navServices) navServices.classList.add("active");
  if (view === "services-list" && navServicesList) {
    navServicesList.classList.add("active");
  }
  if (view === "accounts" && navAccounts) {
    navAccounts.classList.add("active");
  }

  if (view === "queue") {
    loadPendingQueueForDashboard();
  }
  if (view === "reports") {
    loadApprovedTransactionsList();
  }
  if (view === "services-list") {
    loadServicesListPanel();
  }
  if (view === "accounts") {
    createUsersTableHTML();
    loadUsersTable();
  }
  if (view === "transaction-status") {
    initTransactionStatusPage();
  }
}


let emailjsClientPromise;
async function getEmailjsClient() {
  if (emailjsClientPromise) return emailjsClientPromise;

  emailjsClientPromise = (async () => {
    const mod = await import(
      "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/+esm"
    );
    const emailjs = mod.default ?? mod;

    // init() is safe to call once per page load
    if (EMAILJS_CONFIG?.publicKey) {
      emailjs.init(EMAILJS_CONFIG.publicKey);
    }

    return emailjs;
  })();

  return emailjsClientPromise;
}

function isEmailjsConfigured() {
  return Boolean(
    EMAILJS_CONFIG?.publicKey &&
      EMAILJS_CONFIG?.serviceId &&
      EMAILJS_CONFIG?.templateId
  );
}

async function sendApprovalEmail({
  toEmail,
  toName,
  transactionId,
  transactionCode,
  totalAmount,
  orderItems,
}) {
  if (!isEmailjsConfigured()) {
    throw new Error("EmailJS is not configured (missing keys/IDs).");
  }

  if (!toEmail) {
    throw new Error("Missing user email address.");
  }

  const emailjs = await getEmailjsClient();

  
  return await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
    
    customer_email: toEmail,
    customer_name: toName || "User",
    order_id: String(transactionId ?? ""),
    order_total: String(totalAmount ?? ""),
    order_items: String(orderItems ?? ""),

   
    email: toEmail,
    name: toName || "User",

   
    to_email: toEmail,
    to_name: toName || "User",
    transaction_id: String(transactionId ?? ""),
    transaction_code: String(transactionCode ?? ""),
    total_amount: String(totalAmount ?? ""),
  });
}

  if (currentPage === "index.html" || currentPage === "") {
    initLoginPage();
  } else if (currentPage === "dashboard.html") {
    initDashboardPage();
  } else if (currentPage === "transactionDetails.html") {
    initTransactionDetailsPage();
  } else if (currentPage === "transactionStatus.html") {
    initTransactionStatusPage();
  }

function initLoginPage() {
  const loginForm = document.getElementById("loginForm");
  const status = document.getElementById("status");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const loadingText = loadingOverlay?.querySelector(".loading-text");
  const submitBtn = document.querySelector(".submit-btn");

  checkIfLoggedIn();

  if (!loginForm) return;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Show loading spinner
    if (loadingText) loadingText.textContent = "Logging in...";
    if (loadingOverlay) loadingOverlay.style.display = "flex";
    if (submitBtn) submitBtn.disabled = true;
    if (status) status.textContent = "";

    const email = document.getElementById("email")?.value;
    const password = document.getElementById("password")?.value;

    try {
      if (loadingText) loadingText.textContent = "Authenticating...";

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

      if (authError) {
        console.error("Auth error:", authError);
        throw new Error("Authentication failed: " + authError.message);
      }

      if (loadingText) loadingText.textContent = "Fetching user data...";
      console.log("Auth successful, fetching user data for:", email);

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("email_address", email);

      console.log("Query result:", { userData, userError });

      if (userError) {
        console.error("Database error:", userError);
        throw new Error(
          "Database error: " +
            userError.message +
            " (Code: " +
            userError.code +
            ")"
        );
      }

      if (!userData || userData.length === 0) {
        throw new Error("No user found in database with email: " + email);
      }

      if (userData.length > 1) {
        throw new Error("Multiple users found with same email");
      }

      const user = userData[0];
      localStorage.setItem("currentUser", JSON.stringify(user));

  
      if (loadingText) loadingText.textContent = "Logging audit...";
      await logAuthEvent("User logged in");

      loadingText.textContent = "Login successful! Redirecting...";

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1000);
    } catch (error) {
      console.error("Login error:", error);

      // Hide loading spinner on error
      loadingOverlay.style.display = "none";
      submitBtn.disabled = false;


      // Hide loading spinner on error
      loadingOverlay.style.display = "none";
      submitBtn.disabled = false;

      status.textContent = "Login failed: " + error.message;
      status.style.color = "red";
    }
  });
}

function initDashboardPage() {
  const status = document.getElementById("status");
  const logoutBtn = document.getElementById("logoutBtn");
  const serviceForm = document.getElementById("serviceForm");

  // Initialize error message modal early (available globally)
  const errorModal = document.getElementById("errorMessageModal");
  const errorModalMessage = document.getElementById("errorModalMessage");
  const errorModalOkBtn = document.getElementById("errorModalOkBtn");
  const errorModalCloseBtn = document.getElementById("errorModalCloseBtn");

  function showErrorMessage(message) {
    if (errorModal && errorModalMessage) {
      errorModalMessage.textContent = message;
      errorModal.style.display = "flex";
    }
  }

  function closeErrorMessage() {
    if (errorModal) errorModal.style.display = "none";
  }

  if (errorModalOkBtn) errorModalOkBtn.addEventListener("click", closeErrorMessage);
  if (errorModalCloseBtn) errorModalCloseBtn.addEventListener("click", closeErrorMessage);

  // Make showErrorMessage available globally
  window.showErrorMessage = showErrorMessage;

  const userJson = localStorage.getItem("currentUser");


  if (!userJson) {
    window.location.href = "index.html";
    return;
  }

  

  const user = JSON.parse(userJson);

  const dateElement = document.getElementById("current-date");
  if (dateElement) {
    dateElement.textContent = new Date().toLocaleDateString("en-CA");
  }

  const fullName = `${user.given_name} ${user.middle_name || ""} ${user.last_name}`.trim();

  setTextIfExists("userId", user.user_id || "N/A");
  setTextIfExists("userName", fullName);
  setTextIfExists("userFullName", fullName);
  setTextIfExists("userEmail", user.email_address || "N/A");
  setTextIfExists("userRole", user.role || "N/A");
  setTextIfExists("userProgram", user.program || "N/A");
  setTextIfExists("userYear", user.year || "N/A");
  setTextIfExists("userDepartment", user.department || "N/A");

  console.log(user.email_address, user.role);

  const role = (user.role || "").toLowerCase().trim();
  const isSuperAdmin = role === "super admin" || role === "superadmin";
  const isAdmin = role === "admin";
  const isStudent = role === "student";
  const isInstructor = role === "instructor";
  const isRegularUser = isStudent || isInstructor;

  roleState = { isAdmin, isSuperAdmin };

 
  const servicesSection =
    document.getElementById("servicesSection") ||
    document.querySelector(".service-type");
  const servicesCatalogSection = document.getElementById(
    "servicesCatalogSection"
  );
  const servicesCatalogHeader = document.getElementById(
    "servicesCatalogHeader"
  );
  const addServiceBtn = document.getElementById("addServiceBtn");
  const servicesListAddBtn = document.getElementById("services-list-add-btn");
  const servicesListActionsHeader = document.getElementById(
    "services-list-actions-header"
  );
  const navAccounts = document.getElementById("nav-accounts");
  const navQueue = document.getElementById("nav-queue");
  const navReports = document.getElementById("nav-reports");
  const navServices = document.getElementById("nav-services");
  const navServicesList = document.getElementById("nav-services-list");
  const adminContent = document.getElementById("adminOnlyContent");
  const reportsPlaceholder = document.getElementById("reports-placeholder");

  if (hasInlineDashboardViews()) {
    window.switchTab = (tabName) => switchDashboardView(tabName);
    window.showForm = () => switchDashboardView("services");
    window.startEncoding = () => switchDashboardView("services");
    if (isRegularUser) {
      switchDashboardView("services");
    } else {
      switchDashboardView("queue");
    }
  }

  if (isSuperAdmin) {
    if (adminContent) {
      adminContent.innerHTML = "";
    }

    // Hide IN LINE card for superadmin
    const inlineCard = document.getElementById("inline-card");
    if (inlineCard) {
      inlineCard.style.display = "none";
    }

    if (servicesSection) {
      servicesSection.remove();
    }
    if (servicesCatalogSection) {
      servicesCatalogSection.style.display = "none";
    }
    if (servicesCatalogHeader) {
      servicesCatalogHeader.style.display = "none";
    }
    if (addServiceBtn) {
      addServiceBtn.style.display = "none";
    }
    if (servicesListAddBtn) {
      servicesListAddBtn.style.display = "flex";
    }
    if (servicesListActionsHeader) {
      servicesListActionsHeader.style.display = "table-cell";
    }
    if (reportsPlaceholder) {
      reportsPlaceholder.style.display = "none";
    }
    if (navAccounts) {
      navAccounts.style.display = "block";
    }
    if (navQueue) navQueue.style.display = "block";
    if (navReports) navReports.style.display = "block";
    if (navServicesList) navServicesList.style.display = "block";
    if (navServices) navServices.style.display = "none";

    // Create transactions table HTML (includes modal)
    createTransactionsTableHTML();
    
    // Load admin dashboard summary cards
    loadAdminDashboardSummary().catch((err) =>
      console.error("Error loading admin summary:", err)
    );
    // Load queue table
    loadPendingQueueForDashboard().catch((err) =>
      console.error("Error loading queue:", err)
    );
  } else if (isAdmin) {
    if (adminContent) {
      adminContent.innerHTML = "";
    }

    // Hide IN LINE card for admin
    const inlineCard = document.getElementById("inline-card");
    if (inlineCard) {
      inlineCard.style.display = "none";
    }

    if (servicesSection) {
      servicesSection.remove();
    }
    if (servicesCatalogSection) {
      servicesCatalogSection.style.display = "none";
    }
    if (servicesCatalogHeader) {
      servicesCatalogHeader.style.display = "none";
    }
    if (addServiceBtn) {
      addServiceBtn.style.display = "none";
    }
    if (servicesListAddBtn) {
      servicesListAddBtn.style.display = "flex";
    }
    if (servicesListActionsHeader) {
      servicesListActionsHeader.style.display = "table-cell";
    }
    if (reportsPlaceholder) {
      reportsPlaceholder.style.display = "none";
    }
    if (navAccounts) {
      navAccounts.style.display = "none";
    }
    if (navQueue) navQueue.style.display = "block";
    if (navReports) navReports.style.display = "block";
    if (navServicesList) navServicesList.style.display = "block";
    if (navServices) navServices.style.display = "none";

    // Create transactions table HTML (includes modal)
    createTransactionsTableHTML();
    
    // Load admin dashboard summary cards
    loadAdminDashboardSummary().catch((err) =>
      console.error("Error loading admin summary:", err)
    );
    // Load queue table
    loadPendingQueueForDashboard().catch((err) =>
      console.error("Error loading queue:", err)
    );
  } else if (isRegularUser) {
    if (adminContent) {
      adminContent.innerHTML = "";
    }
    if (servicesCatalogSection) {
      servicesCatalogSection.style.display = "none";
    }
    if (servicesCatalogHeader) {
      servicesCatalogHeader.style.display = "none";
    }
    if (addServiceBtn) {
      addServiceBtn.style.display = "none";
    }
    if (servicesListAddBtn) {
      servicesListAddBtn.style.display = "none";
    }
    if (servicesListActionsHeader) {
      servicesListActionsHeader.style.display = "none";
    }
    if (reportsPlaceholder) {
      reportsPlaceholder.style.display = "flex";
    }
    if (navAccounts) {
      navAccounts.style.display = "none";
    }
    if (navQueue) navQueue.style.display = "none";
    if (navReports) navReports.style.display = "none";
    if (navServicesList) navServicesList.style.display = "none";
    if (navServices) navServices.style.display = "block";

    const dashboardView = document.getElementById("dashboard-view");
    if (dashboardView) {
      dashboardView.classList.remove("view-panel--active");
    }

    loadServices();
    // Load user-specific dashboard summary cards (transactions, pending, in-line)
  loadUserDashboardSummary(user).catch((err) =>
    console.error("Error loading user summary cards:", err)
  );

    if (serviceForm) {
      // Proceed-to-transaction modal: OK runs callback, Cancel just closes
      let proceedToTransactionCallback = null;
      const proceedModal = document.getElementById("proceedToTransactionModal");
      const proceedOkBtn = document.getElementById("proceedModalOkBtn");
      const proceedCancelBtn = document.getElementById("proceedModalCancelBtn");
      const proceedCloseBtn = document.getElementById("proceedModalCloseBtn");

      function closeProceedToTransactionModal() {
        if (proceedModal) proceedModal.style.display = "none";
        proceedToTransactionCallback = null;
      }

      function showProceedToTransactionModal(onOk) {
        proceedToTransactionCallback = onOk;
        if (proceedModal) proceedModal.style.display = "flex";
      }

      if (proceedOkBtn) {
        proceedOkBtn.addEventListener("click", () => {
          if (typeof proceedToTransactionCallback === "function") {
            proceedToTransactionCallback();
          }
          closeProceedToTransactionModal();
        });
      }
      if (proceedCancelBtn) proceedCancelBtn.addEventListener("click", closeProceedToTransactionModal);
      if (proceedCloseBtn) proceedCloseBtn.addEventListener("click", closeProceedToTransactionModal);

      serviceForm.addEventListener("submit", (e) => {
        e.preventDefault();

        showProceedToTransactionModal(() => {
          const checkboxes = document.querySelectorAll(
            'input[name="service"]:checked'
          );

          if (checkboxes.length === 0) {
            if (status) status.textContent = "";
            window.showErrorMessage("Please select at least one service");
            return;
          }

          const selectedServices = [];
          let totalAmount = 0;

          checkboxes.forEach((checkbox) => {
            const serviceId = parseInt(checkbox.value, 10);
            const price = parseFloat(checkbox.dataset.price);
            const quantity = parseInt(
              document.getElementById(`quantity_${serviceId}`).value,
              10
            );

            if (quantity > 0) {
              const subtotal = price * quantity;

              selectedServices.push({
                service_id: serviceId,
                quantity: quantity,
                total: subtotal,
              });

              totalAmount += subtotal;
            }
          });

          if (selectedServices.length === 0) {
            if (status) status.textContent = "";
            window.showErrorMessage("Please enter quantity for at least one service");
            return;
          }

          const pending = {
            services: selectedServices,
            totalAmount,
            createdAt: new Date().toISOString(),
          };

          localStorage.setItem("pendingTransaction", JSON.stringify(pending));

          if (hasInlineDashboardViews()) {
            switchDashboardView("transaction-details");
            initTransactionDetailsPage();
          } else {
            window.location.href = "transactionDetails.html";
          }
        });
      });
    }

  
    const viewStatusBtn = document.querySelector(
      '#servicesSection button[type="button"]'
    );
    if (viewStatusBtn) {
      viewStatusBtn.addEventListener("click", async () => {
        await showReceiptForLatestTransaction();
      });
    }
  }

  const queueBody = document.getElementById("queue-tbody");
  if (queueBody) {
    queueBody.addEventListener("click", (event) => {
      const row = event.target.closest("tr[data-transaction-id]");
      if (!row) return;

      const transactionId = Number(row.dataset.transactionId || 0);
      if (!transactionId) return;

      if (typeof window.viewTransactionDetails === "function") {
        window.viewTransactionDetails(transactionId);
      }
    });
  }

  const approvedList = document.getElementById("approvedTransactionsList");
  if (approvedList) {
    approvedList.addEventListener("click", (event) => {
      const row = event.target.closest("tr[data-transaction-id]");
      if (!row) return;

      const transactionId = Number(row.dataset.transactionId || 0);
      if (!transactionId) return;

      if (typeof window.viewTransactionDetails === "function") {
        window.viewTransactionDetails(transactionId);
      }
    });
  }

  if (servicesListAddBtn) {
    servicesListAddBtn.addEventListener("click", () => {
      if (canManageServices()) {
        insertNewServiceRow();
      }
    });
  }

  const servicesListBody = document.getElementById("services-list-body");
  if (servicesListBody) {
    servicesListBody.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;

      const row = event.target.closest("tr");
      if (!row) return;

      if (button.classList.contains("btn-edit")) {
        beginServiceRowEdit(row);
      } else if (button.classList.contains("btn-delete")) {
        const serviceId = Number(row.dataset.serviceId || 0);
        if (serviceId) {
          deleteServiceRow(serviceId);
        }
      } else if (button.classList.contains("btn-save")) {
        saveServiceRow(row);
      } else if (button.classList.contains("btn-cancel")) {
        loadServicesListPanel();
      }
    });
  }

  loadPendingQueueForDashboard();
  loadApprovedTransactionsList();
  loadServicesListPanel();
  initApprovedReportHandlers();

  // Receipt overlay: any .btn-close-receipt closes the overlay (list and receipt panels)
  const successNotice = document.getElementById("success-notice");
  if (successNotice && !successNotice.dataset.receiptCloseBound) {
    successNotice.dataset.receiptCloseBound = "true";
    successNotice.addEventListener("click", (e) => {
      if (!e.target.closest(".btn-close-receipt")) return;
      successNotice.style.display = "none";
      if (hasInlineDashboardViews()) {
        switchDashboardView("services");
      }
    });
  }

 const resetBtn = document.querySelector('button[type="reset"]');
  if (resetBtn) {
    resetBtn.addEventListener("click", (e) => {
      e.preventDefault();
      resetServices();
    });
  }

  if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    // Show logout modal with spinner
    const logoutModal = document.getElementById("logoutModal");
    if (logoutModal) {
      logoutModal.style.display = "block";
    }
    
    // Hide status text
    if (status) {
      status.textContent = "";
      status.style.display = "none";
    }

    // Log the logout action before signing out
    try {
      await logAuthEvent("User logged out");
    } catch (err) {
      console.error("Error logging logout:", err);
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      // Hide modal and show error
      if (logoutModal) logoutModal.style.display = "none";
      if (status) {
        status.textContent = "Logout error: " + error.message;
        status.style.color = "red";
        status.style.display = "block";
      }
    } else {
      localStorage.removeItem("currentUser");
      
      // Update modal message to match login success style
      const modalTitle = document.getElementById("logoutModalTitle");
      const modalText = document.getElementById("logoutModalText");
      if (modalTitle) modalTitle.textContent = "Logout successful!";
      if (modalText) {
        modalText.textContent = "Redirecting...";
        modalText.style.color = "#F5DEB3";
      }

      setTimeout(() => {
        window.location.href = "index.html";
      }, 1500);
    }
  });
  }
}

function initApprovedReportHandlers() {
  const fromInput = document.getElementById("approvedFromDate");
  const toInput = document.getElementById("approvedToDate");
  const exportBtn = document.getElementById("approvedExportBtn");

  if (exportBtn && !exportBtn.dataset.bound) {
    exportBtn.dataset.bound = "true";
    exportBtn.addEventListener("click", () => {
      exportApprovedTransactionsExcel();
    });
  }

  if (fromInput && !fromInput.dataset.bound) {
    fromInput.dataset.bound = "true";
    fromInput.addEventListener("change", () => {
      loadApprovedTransactionsList();
    });
  }

  if (toInput && !toInput.dataset.bound) {
    toInput.dataset.bound = "true";
    toInput.addEventListener("change", () => {
      loadApprovedTransactionsList();
    });
  }
}

function getApprovedDateRange() {
  const fromInput = document.getElementById("approvedFromDate");
  const toInput = document.getElementById("approvedToDate");
  const fromValue = fromInput?.value || "";
  const toValue = toInput?.value || "";

  const range = { fromIso: null, toIso: null };

  if (fromValue) {
    const fromDate = new Date(`${fromValue}T00:00:00`);
    if (!Number.isNaN(fromDate.getTime())) {
      range.fromIso = fromDate.toISOString();
    }
  }

  if (toValue) {
    const toDate = new Date(`${toValue}T23:59:59`);
    if (!Number.isNaN(toDate.getTime())) {
      range.toIso = toDate.toISOString();
    }
  }

  return range;
}

async function fetchApprovedTransactions() {
  const range = getApprovedDateRange();
  let query = supabase
    .from("transactions")
    .select("transaction_id,transaction_code,user_id,date_time,status,processed_by")
    .eq("status", "Approved")
    .order("date_time", { ascending: false });

  if (range.fromIso) {
    query = query.gte("date_time", range.fromIso);
  }
  if (range.toIso) {
    query = query.lte("date_time", range.toIso);
  }

  const { data: transactions, error: txError } = await query;

  return { transactions, txError };
}

function canManageServices() {
  return roleState.isAdmin || roleState.isSuperAdmin;
}

async function loadServicesListPanel() {
  const listBody = document.getElementById("services-list-body");
  if (!listBody) return;
  const actionsHeader = document.getElementById("services-list-actions-header");
  if (actionsHeader) {
    actionsHeader.style.display = canManageServices() ? "table-cell" : "none";
  }

  try {
    const { data: services, error } = await supabase
      .from("service_type")
      .select("service_id,servicename,unitprice")
      .order("service_id", { ascending: true });

    if (error) {
      console.error("Error loading services list:", error);
      listBody.innerHTML =
        '<tr><td colspan="3" style="text-align: center; color: red;">Error loading services</td></tr>';
      return;
    }

    if (!services || services.length === 0) {
      listBody.innerHTML =
        '<tr><td colspan="3" style="text-align: center;">No services found</td></tr>';
      return;
    }

    const showActions = canManageServices();
    listBody.innerHTML = services
      .map(
        (service) => `
          <tr data-service-id="${service.service_id}" data-service-name="${
            service.servicename || ""
          }" data-service-price="${service.unitprice || 0}">
            <td>${service.service_id || "N/A"}</td>
            <td>${service.servicename || "N/A"}</td>
            <td>₱${Number(service.unitprice || 0).toFixed(2)}</td>
            ${
              showActions
                ? `<td>
                    <div class="services-list-actions">
                      <button class="btn-edit" type="button">Edit</button>
                      <button class="btn-delete" type="button">Delete</button>
                    </div>
                  </td>`
                : ""
            }
          </tr>
        `
      )
      .join("");
  } catch (err) {
    console.error("Unexpected services list error:", err);
    listBody.innerHTML =
      '<tr><td colspan="3" style="text-align: center; color: red;">Error loading services</td></tr>';
  }
}

function insertNewServiceRow() {
  const listBody = document.getElementById("services-list-body");
  if (!listBody || !canManageServices()) return;

  if (listBody.querySelector("tr.is-editing")) return;

  const row = document.createElement("tr");
  row.classList.add("is-editing");
  row.innerHTML = `
    <td>NEW</td>
    <td><input type="text" class="modal-input" value="" placeholder="Service name"></td>
    <td><input type="number" class="modal-input" min="0" step="0.01" value="0"></td>
    <td>
      <div class="services-list-actions">
        <button class="btn-save" type="button">Save</button>
        <button class="btn-cancel" type="button">Cancel</button>
      </div>
    </td>
  `;

  listBody.prepend(row);
}

function beginServiceRowEdit(row) {
  if (!row || !canManageServices()) return;
  const listBody = document.getElementById("services-list-body");
  if (listBody && listBody.querySelector("tr.is-editing")) return;

  const name = row.dataset.serviceName || "";
  const price = row.dataset.servicePrice || "0";
  row.classList.add("is-editing");
  row.innerHTML = `
    <td>${row.dataset.serviceId || "N/A"}</td>
    <td><input type="text" class="modal-input" value="${name}"></td>
    <td><input type="number" class="modal-input" min="0" step="0.01" value="${price}"></td>
    <td>
      <div class="services-list-actions">
        <button class="btn-save" type="button">Save</button>
        <button class="btn-cancel" type="button">Cancel</button>
      </div>
    </td>
  `;
}

async function saveServiceRow(row) {
  if (!row || !canManageServices()) return;

  const inputs = row.querySelectorAll("input");
  if (inputs.length < 2) return;

  const name = String(inputs[0].value || "").trim();
  const price = Number(inputs[1].value || 0);

  if (!name) {
    window.alert("Please enter a service name.");
    return;
  }

  if (Number.isNaN(price) || price < 0) {
    window.alert("Please enter a valid unit price.");
    return;
  }

  try {
    const serviceId = Number(row.dataset.serviceId || 0);
    if (serviceId) {
      const { error } = await supabase
        .from("service_type")
        .update({ servicename: name, unitprice: price })
        .eq("service_id", serviceId);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("service_type")
        .insert([{ servicename: name, unitprice: price }]);

      if (error) throw error;
    }

    await loadServicesListPanel();
    await loadServices();
  } catch (err) {
    console.error("Error saving service:", err);
    window.alert("Failed to save service: " + (err?.message || err));
  }
}

async function deleteServiceRow(serviceId) {
  if (!canManageServices()) return;
  const confirmDelete = window.confirm(
    "Are you sure you want to delete this service?"
  );
  if (!confirmDelete) return;

  try {
    const { error } = await supabase
      .from("service_type")
      .delete()
      .eq("service_id", serviceId);

    if (error) throw error;

    await loadServicesListPanel();
    await loadServices();
  } catch (err) {
    console.error("Error deleting service:", err);
    window.alert("Failed to delete service: " + (err?.message || err));
  }
}

async function loadApprovedTransactionsList() {
  const listContainer = document.getElementById("approvedTransactionsList");
  if (!listContainer) return;

  try {
    const { transactions, txError } = await fetchApprovedTransactions();

    if (txError) {
      console.error("Error loading approved transactions:", txError);
      listContainer.innerHTML =
        '<p style="color: #b22222;">Error loading approved transactions.</p>';
      updateReportSummaryElements(0, 0);
      await loadReportPendingCount();
      return;
    }

    if (!transactions || transactions.length === 0) {
      listContainer.innerHTML =
        '<p style="color: #666;">No approved transactions found.</p>';
      updateReportSummaryElements(0, 0);
      await loadReportPendingCount();
      return;
    }

    const userIds = [
      ...new Set(transactions.map((tx) => tx.user_id).filter(Boolean)),
    ];
    let usersById = {};

    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("user_id,given_name,last_name")
        .in("user_id", userIds);

      if (usersError) {
        console.error("Error loading approved users:", usersError);
      } else {
        usersById = (users || []).reduce((acc, user) => {
          acc[user.user_id] = user;
          return acc;
        }, {});
      }
    }

    const txIds = transactions.map((tx) => tx.transaction_id);
    let totalsById = {};

    if (txIds.length > 0) {
      const { data: details, error: detailError } = await supabase
        .from("transaction_detail")
        .select("transaction_id,total_amount")
        .in("transaction_id", txIds);

      if (detailError) {
        console.error("Error loading approved totals:", detailError);
      } else {
        (details || []).forEach((detail) => {
          totalsById[detail.transaction_id] = detail.total_amount || 0;
        });
      }
    }

    const rows = transactions
      .map((tx) => {
        const user = usersById[tx.user_id];
        const name = user
          ? `${user.given_name} ${user.last_name}`.trim()
          : "N/A";
        const dateTime = tx.date_time
          ? new Date(tx.date_time).toLocaleString()
          : "N/A";
        const total = totalsById[tx.transaction_id] || 0;

        return `
          <tr class="queue-row" data-transaction-id="${tx.transaction_id}" style="border-bottom: 1px solid #e0e0e0;">
            <td style="padding: 18px 16px; vertical-align: middle; color: #333;">${tx.transaction_id}</td>
            <td style="padding: 18px 16px; vertical-align: middle; color: #333;">${tx.transaction_code || "N/A"}</td>
            <td style="padding: 18px 16px; vertical-align: middle; color: #333;">${tx.user_id || "N/A"}</td>
            <td style="padding: 18px 16px; vertical-align: middle; color: #333; font-weight: 600;">${name}</td>
            <td style="padding: 18px 16px; vertical-align: middle; color: #333;">${dateTime}</td>
            <td style="padding: 18px 16px; vertical-align: middle; color: #333;">${tx.processed_by || "N/A"}</td>
            <td style="padding: 18px 16px; vertical-align: middle; color: #333; text-align: right; font-weight: 600;">₱${Number(total).toFixed(2)}</td>
          </tr>
        `;
      })
      .join("");

    listContainer.innerHTML = `
      <table style="width: 100%; border-collapse: collapse;" class="approved-tx-table">
        <thead style="background-color: var(--primary-maroon); color: var(--white); border-bottom: 3px solid var(--accent-gold);">
          <tr>
            <th style="text-align: left; padding: 18px 16px; font-size: 12px; font-weight: 700; text-transform: uppercase;">Transaction ID</th>
            <th style="text-align: left; padding: 18px 16px; font-size: 12px; font-weight: 700; text-transform: uppercase;">Code</th>
            <th style="text-align: left; padding: 18px 16px; font-size: 12px; font-weight: 700; text-transform: uppercase;">User ID</th>
            <th style="text-align: left; padding: 18px 16px; font-size: 12px; font-weight: 700; text-transform: uppercase;">Approved (Name)</th>
            <th style="text-align: left; padding: 18px 16px; font-size: 12px; font-weight: 700; text-transform: uppercase;">Date</th>
            <th style="text-align: left; padding: 18px 16px; font-size: 12px; font-weight: 700; text-transform: uppercase;">Approved By</th>
            <th style="text-align: right; padding: 18px 16px; font-size: 12px; font-weight: 700; text-transform: uppercase;">Total</th>
          </tr>
        </thead>
        <tbody style="background-color: var(--white);">
          ${rows}
        </tbody>
      </table>
    `;

    const totalRevenue = Object.values(totalsById).reduce((sum, amt) => sum + Number(amt || 0), 0);
    updateReportSummaryElements(transactions.length, totalRevenue);
  } catch (err) {
    console.error("Unexpected error loading approved transactions:", err);
    listContainer.innerHTML =
      '<p style="color: #b22222;">Unexpected error loading approved transactions.</p>';
    updateReportSummaryElements(0, 0);
  }
  await loadReportPendingCount();
}

async function loadReportPendingCount() {
  const el = document.getElementById("report-pending-count");
  if (!el) return;
  try {
    const { count, error } = await supabase
      .from("transactions")
      .select("transaction_id", { count: "exact", head: true })
      .eq("status", "Pending");
    if (!error) el.textContent = (count ?? 0).toString();
    else el.textContent = "0";
  } catch (_) {
    el.textContent = "0";
  }
}

function updateReportSummaryElements(totalTransactions, totalRevenue) {
  const txEl = document.getElementById("report-total-transactions");
  const revEl = document.getElementById("report-total-revenue");
  if (txEl) txEl.textContent = String(totalTransactions);
  if (revEl) revEl.textContent = "₱" + Number(totalRevenue).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const PRINTING_REPORT_CATEGORIES = [
  "BLK TEXT",
  "BLK GRAPHICS",
  "COLORED TEXT",
  "COL GRAPHICS",
  "LIB FINE",
];

const PRINTING_REPORT_MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

function getPrintingCategoryIndex(servicename) {
  const u = (servicename || "").toUpperCase().trim();
  if (u.includes("BLK") && u.includes("GRAPHICS")) return 1;
  if (u.includes("BLK")) return 0;
  if ((u.includes("COLORED") || u.includes("COLOURED")) && u.includes("TEXT")) return 2;
  if ((u.includes("COL") || u.includes("COLOR")) && u.includes("GRAPHICS")) return 3;
  if (u.includes("FINE") || u.includes("LIB ")) return 4;
  return -1;
}

async function exportApprovedTransactionsExcel() {
  const { transactions, txError } = await fetchApprovedTransactions();
  if (txError) {
    console.error("Error exporting approved transactions:", txError);
    window.alert("Failed to export report.");
    return;
  }

  const txIds = (transactions || []).map((tx) => tx.transaction_id);
  let detailsList = [];
  if (txIds.length > 0) {
    const { data: details, error: detailError } = await supabase
      .from("transaction_detail")
      .select("transaction_id,total_amount,services")
      .in("transaction_id", txIds);
    if (!detailError && details) detailsList = details;
  }

  const serviceIds = new Set();
  detailsList.forEach((d) => {
    (d.services || []).forEach((s) => serviceIds.add(s.service_id));
  });
  let serviceNames = {};
  if (serviceIds.size > 0) {
    const { data: services } = await supabase
      .from("service_type")
      .select("service_id,servicename")
      .in("service_id", [...serviceIds]);
    (services || []).forEach((s) => {
      serviceNames[s.service_id] = s.servicename || "";
    });
  }

  const aggregate = Array.from({ length: 12 }, () => ({}));
  transactions.forEach((tx) => {
    const dt = tx.date_time ? new Date(tx.date_time) : null;
    if (!dt || isNaN(dt.getTime())) return;
    const monthIndex = dt.getMonth();
    const day = dt.getDate();
    const detail = detailsList.find((d) => d.transaction_id === tx.transaction_id);
    const items = detail?.services || [];
    items.forEach((item) => {
      const name = serviceNames[item.service_id] || "";
      const catIndex = getPrintingCategoryIndex(name);
      if (catIndex < 0) return;
      if (!aggregate[monthIndex][catIndex]) aggregate[monthIndex][catIndex] = {};
      const qty = Number(item.quantity) || 0;
      aggregate[monthIndex][catIndex][day] = (aggregate[monthIndex][catIndex][day] || 0) + qty;
    });
  });

  const wb = buildPrintingReportWorkbook(aggregate);
  if (!wb) return;

  const range = getApprovedDateRange();
  const fromStr = range.fromIso ? range.fromIso.slice(0, 10) : "";
  const toStr = range.toIso ? range.toIso.slice(0, 10) : "";
  const dateSuffix = fromStr && toStr ? `_${fromStr}_${toStr}` : fromStr ? `_from_${fromStr}` : toStr ? `_to_${toStr}` : "";
  const filename = `Printing Services Report${dateSuffix}.xlsx`;
  XLSX.writeFile(wb, filename);
}

function getDayColLetter(day1To31) {
  const colIndex = day1To31 + 1;
  if (colIndex <= 26) return String.fromCharCode(64 + colIndex);
  return "A" + String.fromCharCode(64 + colIndex - 26);
}

function buildPrintingReportWorkbook(aggregate) {
  if (typeof XLSX === "undefined") {
    window.alert("Excel export library not loaded. Please refresh the page.");
    return null;
  }
  const wb = XLSX.utils.book_new();
  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const monthData = aggregate[monthIndex] || {};
    const rows = [];
    rows.push([]);
    rows.push([]);
    const headerRow = [""];
    for (let d = 1; d <= 31; d++) headerRow.push(d);
    headerRow.push("TOTAL");
    rows.push(headerRow);
    for (let catIndex = 0; catIndex < PRINTING_REPORT_CATEGORIES.length; catIndex++) {
      const row = [PRINTING_REPORT_CATEGORIES[catIndex]];
      const dayData = monthData[catIndex] || {};
      for (let day = 1; day <= 31; day++) {
        row.push(dayData[day] ?? 0);
      }
      const excelRow = 4 + catIndex;
      row.push({ f: `=SUM(B${excelRow}:AE${excelRow})` });
      rows.push(row);
    }
    const totalRow = ["TOTAL"];
    for (let day = 1; day <= 31; day++) {
      const colLetter = getDayColLetter(day);
      totalRow.push({ f: `=SUM(${colLetter}4:${colLetter}8)` });
    }
    totalRow.push({ f: "=SUM(B9:AE9)" });
    rows.push(totalRow);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, PRINTING_REPORT_MONTHS[monthIndex]);
  }
  return wb;
}


window.handleQueueBadgeClick = function(event, transactionId) {
  event.stopPropagation();
  event.preventDefault();
  console.log("Badge clicked, transaction ID:", transactionId);
  if (typeof window.viewTransactionDetails === "function") {
    window.viewTransactionDetails(transactionId);
  } else {
    console.error("viewTransactionDetails function not found!");
  }
};

window.handleQueueRowClick = function(event, transactionId) {
  // Don't trigger if clicking on the badge
  if (!event.target.classList.contains("queue-badge-clickable") && !event.target.closest(".queue-badge-clickable")) {
    console.log("Row clicked, transaction ID:", transactionId);
    if (typeof window.viewTransactionDetails === "function") {
      window.viewTransactionDetails(transactionId);
    } else {
      console.error("viewTransactionDetails function not found!");
    }
  }
};

async function loadPendingQueueForDashboard() {
  const tbody = document.getElementById("queue-tbody");
  if (!tbody) return;

  try {
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("transaction_id,user_id,status,date_time")
      .eq("status", "Pending")
      .order("date_time", { ascending: true });

    if (txError) {
      console.error("Error loading queue transactions:", txError);
      tbody.innerHTML =
        '<tr><td colspan="4" style="text-align: center; color: red;">Error loading queue</td></tr>';
      return;
    }

    if (!transactions || transactions.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="4" style="text-align: center;">No pending transactions</td></tr>';
      return;
    }

    const userIds = [
      ...new Set(transactions.map((tx) => tx.user_id).filter(Boolean)),
    ];
    let usersById = {};

    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("user_id,given_name,last_name")
        .in("user_id", userIds);

      if (usersError) {
        console.error("Error loading queue users:", usersError);
      } else {
        usersById = (users || []).reduce((acc, user) => {
          acc[user.user_id] = user;
          return acc;
        }, {});
      }
    }

    tbody.innerHTML = transactions
      .map((tx) => {
        const user = usersById[tx.user_id];
        const name = user
          ? `${user.given_name} ${user.last_name}`.trim()
          : "N/A";
        const time = tx.date_time
          ? new Date(tx.date_time).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "N/A";
        const statusClass = "waiting";

        return `
          <tr class="queue-row" data-transaction-id="${tx.transaction_id}">
            <td>${tx.user_id || "N/A"}</td>
            <td>${name}</td>
            <td>${time}</td>
            <td><button class="badge ${statusClass}" onclick="window.viewTransactionDetails(${tx.transaction_id})" style="cursor: pointer; border: none; padding: 5px 15px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #fff; background-color: var(--status-waiting);">pending</button></td>
          </tr>
        `;
      })
      .join("");
  } catch (err) {
    console.error("Unexpected queue load error:", err);
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align: center; color: red;">Error loading queue</td></tr>';
  }
}

function setTextIfExists(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = value;
  }
}

// Load admin/superadmin dashboard summary cards (Transactions, Pending)
async function loadAdminDashboardSummary() {
  try {
    const txCountEl = document.getElementById("transaction-count");
    const pendingEl = document.getElementById("pending-email-count");

    if (!txCountEl && !pendingEl) return;

    // Fetch all transactions (for admin view - all transactions in system)
    const { data: allTransactions, error: txError } = await supabase
      .from("transactions")
      .select("transaction_id,status")
      .order("transaction_id", { ascending: false });

    let totalTransactions = 0;
    let pendingCount = 0;

    if (!txError && allTransactions) {
      totalTransactions = allTransactions.length;
      pendingCount = allTransactions.filter(
        (tx) => tx.status === "Pending"
      ).length;
    }

    if (txCountEl) txCountEl.textContent = String(totalTransactions);
    if (pendingEl) pendingEl.textContent = String(pendingCount);
  } catch (err) {
    console.error("Error loading admin dashboard summary:", err);
  }
}

// Load user-specific dashboard summary cards (Transactions, Pending, In line)
async function loadUserDashboardSummary(user) {
  try {
    const txCountEl = document.getElementById("transaction-count");
    const pendingEl = document.getElementById("pending-email-count");
    const inlineEl = document.getElementById("inline-position");

    if (!txCountEl && !pendingEl && !inlineEl) return;

    // All transactions for this user
    const { data: userTransactions, error: userTxError } = await supabase
      .from("transactions")
      .select("transaction_id,status,date_time,user_id")
      .eq("user_id", user.user_id)
      .order("date_time", { ascending: false });

    let totalTransactions = 0;
    let pendingCount = 0;

    if (!userTxError && userTransactions) {
      totalTransactions = userTransactions.length;
      pendingCount = userTransactions.filter(
        (tx) => tx.status === "Pending"
      ).length;
    }

    if (txCountEl) txCountEl.textContent = String(totalTransactions);
    if (pendingEl) pendingEl.textContent = String(pendingCount);

    // Compute queue position using global pending queue
    let inlineText = "-";
    const { data: pendingQueue, error: pendingError } = await supabase
      .from("transactions")
      .select("transaction_id,user_id,status,date_time")
      .eq("status", "Pending")
      .order("date_time", { ascending: true });

    if (!pendingError && pendingQueue && pendingQueue.length > 0) {
      const userPending = pendingQueue.filter(
        (tx) => tx.user_id === user.user_id
      );
      if (userPending.length > 0) {
        const latestUserPending =
          userPending[userPending.length - 1];
        const indexInQueue = pendingQueue.findIndex(
          (tx) => tx.transaction_id === latestUserPending.transaction_id
        );
        if (indexInQueue !== -1) {
          inlineText = `#${indexInQueue + 1}`;
        }
      }
    }

    if (inlineEl) inlineEl.textContent = inlineText;
  } catch (err) {
    console.error("Error loading user dashboard summary:", err);
  }
}

async function loadServices() {
  const servicesList = document.getElementById("servicesList");
  if (!servicesList) return;

  try {
    const { data: services, error } = await supabase
      .from("service_type")
      .select("*")
      .order("service_id", { ascending: true });

    if (error) {
      console.error("Error fetching services:", error);
      servicesList.innerHTML = "<p>Error loading services</p>";
      return;
    }

    if (!services || services.length === 0) {
      servicesList.innerHTML = "<p>No services available</p>";
      return;
    }

    // Render services with classes used by the user dashboard HTML/CSS
    servicesList.innerHTML = services
      .map(
        (service) => `
            <div>
                <input class="checkbox" type="checkbox" id="service_${service.service_id}" name="service" value="${service.service_id}" data-price="${service.unitprice}">
                <div class="servicename-holder">
                  <label class="service-name" for="service_${service.service_id}">${service.servicename} - ₱${service.unitprice}</label>
                </div>
                <input class="service-qty" type="number" id="quantity_${service.service_id}" min="0" value="0" disabled>
            </div>
        `
      )
      .join("");

    services.forEach((service) => {
      const checkbox = document.getElementById(`service_${service.service_id}`);
      const quantityInput = document.getElementById(
        `quantity_${service.service_id}`
      );

      if (!checkbox || !quantityInput) return;

      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          quantityInput.disabled = false;
          quantityInput.value = 1;
        } else {
          quantityInput.disabled = true;
          quantityInput.value = 0;
        }

        updateTotalAmount();
      });

      quantityInput.addEventListener("input", () => {
        if (!quantityInput.disabled) {
          updateTotalAmount();
        }
      });
    });

  } catch (error) {
    console.error("Error loading services:", error);
    servicesList.innerHTML = "<p>Error loading services</p>";
  }
}

function createUsersTableHTML() {
  const accountsContent = document.getElementById("accountsContent");
  const adminContent = accountsContent || document.getElementById("adminOnlyContent");
  if (!adminContent) return;

  adminContent.innerHTML = `
    <div id="usersTableSection" style="margin: 20px 0;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; color: #4a0000; font-size: 18px; font-weight: 700;">Users Table</h3>
        <button id="addUserBtn" style="background: linear-gradient(135deg, #2e8b57 0%, #246b43 100%); color: white; border: 2px solid white; padding: 10px 24px; border-radius: 25px; cursor: pointer; font-weight: 700; font-size: 13px; text-transform: uppercase;">+ Add New User</button>
      </div>
      <div id="usersTableWrapper" style="overflow-x: auto; background-color: #fff; border-radius: 0 15px 15px 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.2); width: 100%;">
        <table id="usersTable" class="users-table" style="width: 100%; min-width: 1200px; border-collapse: collapse;">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Given Name</th>
              <th>Middle Name</th>
              <th>Last Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Program</th>
              <th>Year</th>
              <th>Department</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="usersTableBody">
            <tr><td colspan="10" style="text-align: center; padding: 20px; color: #666;">Loading...</td></tr>
          </tbody>
        </table>
      </div>
      <p id="crudStatus" style="margin-top: 10px; font-weight: bold;"></p>
    </div>
    
    <!-- User Form Modal -->
    <div id="userFormModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 1000;">
      <div style="background-color: white; margin: 50px auto; padding: 30px; width: 500px; border-radius: 10px; max-height: 80vh; overflow-y: auto;">
        <h2 id="formTitle">Add New User</h2>
        <form id="userForm">
          <input type="hidden" id="formUserId">
          
          <label style="display: block; margin-top: 10px; font-weight: bold;">Given Name:</label>
          <input type="text" id="formGivenName" required style="width: 100%; padding: 8px; margin-top: 5px;">
          
          <label style="display: block; margin-top: 10px; font-weight: bold;">Middle Name:</label>
          <input type="text" id="formMiddleName" style="width: 100%; padding: 8px; margin-top: 5px;">
          
          <label style="display: block; margin-top: 10px; font-weight: bold;">Last Name:</label>
          <input type="text" id="formLastName" required style="width: 100%; padding: 8px; margin-top: 5px;">
          
          <label style="display: block; margin-top: 10px; font-weight: bold;">Email:</label>
          <input type="email" id="formEmail" required style="width: 100%; padding: 8px; margin-top: 5px;">
          
          <label style="display: block; margin-top: 10px; font-weight: bold;">Role:</label>
          <select id="formRole" required style="width: 100%; padding: 8px; margin-top: 5px;">
            <option value="">Select Role</option>
            <option value="Student">Student</option>
            <option value="Admin">Admin</option>
          </select>
          
          <label style="display: block; margin-top: 10px; font-weight: bold;">Program:</label>
          <input type="text" id="formProgram" style="width: 100%; padding: 8px; margin-top: 5px;">
          
          <label style="display: block; margin-top: 10px; font-weight: bold;">Year:</label>
          <input type="text" id="formYear" style="width: 100%; padding: 8px; margin-top: 5px;">
          
          <label style="display: block; margin-top: 10px; font-weight: bold;">Department:</label>
          <input type="text" id="formDepartment" style="width: 100%; padding: 8px; margin-top: 5px;">
          
          <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button type="submit" style="flex: 1; background-color: #4CAF50; color: white; padding: 10px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Save</button>
            <button type="button" id="cancelFormBtn" style="flex: 1; background-color: #f44336; color: white; padding: 10px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  // Add event listeners
  document.getElementById("addUserBtn").addEventListener("click", openAddUserForm);
  document.getElementById("cancelFormBtn").addEventListener("click", closeUserForm);
  document.getElementById("userForm").addEventListener("submit", handleUserFormSubmit);
}

function createServiceTypesTableHTML() {
  const adminContent = document.getElementById("adminOnlyContent");
  adminContent.insertAdjacentHTML(
    "beforeend",
    `
    <div id="serviceTypesSection" style="margin: 20px 0;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h3 style="margin: 0;">Service Types</h3>
        <button id="addServiceTypeBtn" style="background-color: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">+ Add Service Type</button>
      </div>
      <div style="overflow-x: auto;">
        <table id="serviceTypesTable" border="1" cellpadding="10" cellspacing="0" style="width: 100%; border-collapse: collapse;">
          <thead style="background-color: #4CAF50; color: white;">
            <tr>
              <th>Service ID</th>
              <th>Service Name</th>
              <th>Unit Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="serviceTypesTableBody">
            <tr><td colspan="4" style="text-align: center;">Loading...</td></tr>
          </tbody>
        </table>
      </div>
      <p id="serviceTypeStatus" style="margin-top: 10px; font-weight: bold;"></p>
    </div>

    <div id="serviceTypeFormModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 1000;">
      <div style="background-color: white; margin: 50px auto; padding: 30px; width: 500px; border-radius: 10px; max-height: 80vh; overflow-y: auto;">
        <h2 id="serviceTypeFormTitle">Add Service Type</h2>
        <form id="serviceTypeForm">
          <input type="hidden" id="serviceTypeId">

          <label style="display: block; margin-top: 10px; font-weight: bold;">Service Name:</label>
          <input type="text" id="serviceTypeName" required style="width: 100%; padding: 8px; margin-top: 5px;">

          <label style="display: block; margin-top: 10px; font-weight: bold;">Unit Price:</label>
          <input type="number" id="serviceTypePrice" min="0" step="0.01" required style="width: 100%; padding: 8px; margin-top: 5px;">

          <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button type="submit" style="flex: 1; background-color: #4CAF50; color: white; padding: 10px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Save</button>
            <button type="button" id="cancelServiceTypeBtn" style="flex: 1; background-color: #f44336; color: white; padding: 10px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Cancel</button>
          </div>
        </form>
      </div>
    </div>
    `
  );

  document
    .getElementById("addServiceTypeBtn")
    .addEventListener("click", openAddServiceTypeForm);
  document
    .getElementById("cancelServiceTypeBtn")
    .addEventListener("click", closeServiceTypeForm);
  document
    .getElementById("serviceTypeForm")
    .addEventListener("submit", handleServiceTypeFormSubmit);
}

function createTransactionsTableHTML() {
  // This function now only creates the modal, not the duplicate tables
  // Tables are handled by loadApprovedTransactionsList() in the reports section
  
  // Append modal directly to body (not adminContent) so it overlays everything
  const modalHTML = `
    <!-- Transaction Details Modal - WAITING QUEUE Style Design -->
    <style id="transactionModalStyles">
      #transactionDetailsModal #finalizeInvoiceBtn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4) !important;
      }
      #transactionDetailsModal #closeDetailsBtn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(217, 83, 79, 0.5) !important;
        background: #c9302c !important;
      }
      #transactionDetailsModal #confirmTransactionCode:focus {
        outline: none;
        border-color: #8b6f47 !important;
        box-shadow: 0 0 0 2px rgba(139, 111, 71, 0.2);
        background-color: #ffffff !important;
      }
      #transactionDetailsModal #confirmTransactionCode::placeholder {
        color: #999999;
        opacity: 1;
      }
      #transactionDetailsModal tbody tr:hover {
        background-color: #f5f5f5 !important;
      }
    </style>
    <div id="transactionDetailsModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); z-index: 1000; backdrop-filter: blur(2px);">
      <div style="background: #ffffff; margin: 30px auto; padding: 0; width: 90%; max-width: 900px; border-radius: 8px; max-height: 90vh; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.3); display: flex; flex-direction: column;">
        <!-- Modal Header - Primary Maroon with White Title -->
        <div style="background: linear-gradient(135deg, #4a0000 0%, #350000 100%); padding: 18px 24px; border-bottom: 2px solid #ffcc00;">
          <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; text-align: left; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">Transaction Details</h2>
        </div>
        
        <!-- Modal Content - White Background -->
        <div id="transactionDetailsContent" style="padding: 0; overflow-y: auto; flex: 1; background: #ffffff;">
          <!-- Transaction Info Section - Cream Header -->
          <div style="background: #f5e6d3; padding: 16px 24px; border-bottom: 1px solid #d4c4b0;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px;">
              <div>
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b2a2a; margin-bottom: 4px;">Transaction ID</div>
                <div style="font-size: 14px; font-weight: 600; color: #333333;" id="detailTransactionId">-</div>
              </div>
              <div>
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b2a2a; margin-bottom: 4px;">Transaction Code</div>
                <div style="font-size: 14px; font-weight: 600; color: #333333;" id="detailTransactionCode">-</div>
              </div>
              <div>
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b2a2a; margin-bottom: 4px;">User</div>
                <div style="font-size: 14px; font-weight: 600; color: #333333;" id="detailUserName">-</div>
              </div>
              <div>
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b2a2a; margin-bottom: 4px;">Date & Time</div>
                <div style="font-size: 14px; font-weight: 600; color: #333333;" id="detailDateTime">-</div>
              </div>
              <div>
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b2a2a; margin-bottom: 4px;">School Year</div>
                <div style="font-size: 14px; font-weight: 600; color: #333333;" id="detailSchoolYear">-</div>
              </div>
              <div>
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b2a2a; margin-bottom: 4px;">Term</div>
                <div style="font-size: 14px; font-weight: 600; color: #333333;" id="detailTerm">-</div>
              </div>
              <div>
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b2a2a; margin-bottom: 4px;">Status</div>
                <div style="font-size: 14px; font-weight: 600; color: #333333;" id="detailStatus">-</div>
              </div>
              <div>
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b2a2a; margin-bottom: 4px;">Processed By</div>
                <div style="font-size: 14px; font-weight: 600; color: #333333;" id="detailProcessedBy">-</div>
              </div>
      </div>
    </div>
    
          <!-- Transaction Code Input Section - White Background -->
          <div style="background: #ffffff; padding: 20px 24px; border-bottom: 1px solid #e0e0e0;">
            <label for="confirmTransactionCode" style="display: block; font-weight: 700; margin-bottom: 10px; color: #6b2a2a; text-transform: uppercase; letter-spacing: 0.5px; font-size: 12px;">Enter Transaction Code to Finalize:</label>
            <input id="confirmTransactionCode" type="text" autocomplete="off" placeholder="Enter code here..." style="width: 100%; padding: 12px 16px; border-radius: 6px; border: 1px solid #cccccc; background-color: #ffffff; color: #333333; font-size: 14px; font-weight: 500; transition: all 0.3s ease;" />
            <p id="transactionCodeStatus" style="margin: 10px 0 0; font-weight: 600; font-size: 12px; min-height: 20px;"></p>
          </div>

          <!-- Services Section - White Body -->
          <div style="margin-bottom: 0;">
            <div style="background: #ffffff; overflow: hidden;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead style="background: #f5e6d3;">
                  <tr>
                    <th style="padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b2a2a; border-bottom: 1px solid #d4c4b0;">Service Name</th>
                    <th style="padding: 12px 16px; text-align: center; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b2a2a; border-bottom: 1px solid #d4c4b0;">Quantity</th>
                    <th style="padding: 12px 16px; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b2a2a; border-bottom: 1px solid #d4c4b0;">Unit Price</th>
                    <th style="padding: 12px 16px; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b2a2a; border-bottom: 1px solid #d4c4b0;">Total</th>
            </tr>
          </thead>
                <tbody id="detailServicesTable" style="background: #ffffff;">
          </tbody>
        </table>
      </div>
    </div>
    
          <!-- Grand Total Section - Cream Background -->
          <div style="background: #f5e6d3; padding: 18px 24px; border-top: 1px solid #d4c4b0; border-bottom: 1px solid #d4c4b0;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 14px; font-weight: 700; color: #6b2a2a; text-transform: uppercase; letter-spacing: 0.5px;">Grand Total</span>
              <span style="font-size: 20px; font-weight: 800; color: #6b2a2a;" id="detailGrandTotal">0.00</span>
          </div>
        </div>
        </div>

        <!-- Modal Footer - White Background -->
        <div style="padding: 18px 24px; background: #ffffff; border-top: 1px solid #e0e0e0; display: flex; gap: 12px; justify-content: flex-end;">
          <button id="closeDetailsBtn" style="min-width: 120px; padding: 10px 20px; background: #d9534f; color: #ffffff; border: none; border-radius: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: all 0.3s ease;">Close</button>
          <button id="finalizeInvoiceBtn" style="min-width: 180px; padding: 10px 20px; background: #28a745; color: #ffffff; border: none; border-radius: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: all 0.3s ease;">Finalize & Send Invoice</button>
        </div>
      </div>
    </div>
  `;
  
  // Only append modal if it doesn't already exist
  if (!document.getElementById("transactionDetailsModal")) {
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log("Transaction Details Modal created and appended to body");
  } else {
    console.log("Transaction Details Modal already exists");
  }
  
  setTimeout(() => {
    const closeBtn = document.getElementById("closeDetailsBtn");
    const finalizeBtn = document.getElementById("finalizeInvoiceBtn");
    if (closeBtn) closeBtn.addEventListener("click", closeTransactionDetails);
    if (finalizeBtn) finalizeBtn.addEventListener("click", handleFinalizeInvoice);
  }, 100);
}

function createAdminReportsHTML() {
  const adminContent = document.getElementById("adminOnlyContent");
  if (!adminContent) return;

  const reportsSection = `
    <div id="adminReportsSection" style="margin: 20px 0;">
      <h3>Transaction Summary (Approved)</h3>
      <div id="adminReportsSummary">
        <p>Total Approved Amount (this month): <span id="reportTotalAmount">₱0.00</span></p>
        <p>Total Approved Transactions (this month): <span id="reportTotalCount">0</span></p>
        <p>Average Amount per Transaction: <span id="reportAvgAmount">₱0.00</span></p>
      </div>
      <div style="max-width: 600px;">
        <canvas id="reportDailyChart"></canvas>
      </div>
      <button id="exportTxReportCsvBtn">Export Monthly Report (CSV)</button>
    </div>
  `;

  adminContent.insertAdjacentHTML("beforeend", reportsSection);
}

async function loadTransactionsTable() {
  const approvedTableBody = document.getElementById("approvedTableBody");

  if (!approvedTableBody) {
    return;
  }

  try {
    // Fetch all transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from("transactions")
      .select("*")
      .order("transaction_id", { ascending: false });

    if (transactionsError) {
      console.error("Error fetching transactions:", transactionsError);
      const errorMsg = '<tr><td colspan="11" style="text-align: center; color: red;">Error loading transactions</td></tr>';
      if (approvedTableBody) approvedTableBody.innerHTML = errorMsg;
      return;
    }

    // Separate transactions by status
    const pendingTransactions = transactions.filter(t => t.status === "Pending");
    const approvedTransactions = transactions.filter(t => t.status === "Approved");

    const userIds = [...new Set(transactions.map((t) => t.user_id).filter(Boolean))];
    let usersById = {};

    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("user_id, given_name, last_name")
        .in("user_id", userIds);

      if (usersError) {
        console.error("Error fetching users:", usersError);
      } else {
        usersById = users.reduce((acc, user) => {
          acc[user.user_id] = user;
          return acc;
        }, {});
      }
    }

    // Fetch transaction details for all transactions
    const { data: allDetails, error: detailsError } = await supabase
      .from("transaction_detail")
      .select("*");

    if (detailsError) {
      console.error("Error fetching transaction details:", detailsError);
    }

    // Create a map of transaction_id to total_amount
    const detailsMap = {};
    if (allDetails) {
      allDetails.forEach((detail) => {
        detailsMap[detail.transaction_id] = detail.total_amount;
      });
    }

    // Function to render table rows
    const renderTableRows = (transactionList, includeProcessedBy = false) => {
      if (!transactionList || transactionList.length === 0) {
        return `<tr><td colspan="${includeProcessedBy ? 11 : 10}" style="text-align: center;">No transactions</td></tr>`;
      }

      return transactionList
        .map(
          (transaction) => {
            const user = usersById[transaction.user_id];
            const userName = user ? `${user.given_name} ${user.last_name}` : "N/A";
            const dateTime = new Date(transaction.date_time).toLocaleString();
            const totalAmount = detailsMap[transaction.transaction_id] || 0;
            const statusColor = transaction.status === "Pending" ? "#ff9800" :
                               transaction.status === "Approved" ? "#4CAF50" : "#f44336";
            
            const processedByCell = includeProcessedBy ? `<td>${transaction.processed_by || "N/A"}</td>` : "";
            const buttonLabel = includeProcessedBy ? "View Details" : "View/Process Details";
            
            return `
              <tr>
                  <td>${transaction.transaction_id}</td>
                  <td>${transaction.transaction_code || "N/A"}</td>
                  <td>${transaction.user_id}</td>
                  <td>${userName}</td>
                  <td>${dateTime}</td>
                  <td>${transaction.school_year || "N/A"}</td>
                  <td>${transaction.term || "N/A"}</td>
                  <td style="color: ${statusColor}; font-weight: bold;">${transaction.status || "N/A"}</td>
                  ${processedByCell}
                  <td>₱${totalAmount.toFixed(2)}</td>
                  <td>
                      <button onclick="viewTransactionDetails(${transaction.transaction_id})" style="background-color: #2196F3; color: white; padding: 5px 10px; border: none; border-radius: 3px; cursor: pointer;">${buttonLabel}</button>
                  </td>
              </tr>
            `;
          }
        )
        .join("");
    };

    // Render approved transactions table
    if (approvedTableBody) {
    approvedTableBody.innerHTML = renderTableRows(approvedTransactions, true);
    }

    // Update summary cards for admin/superadmin dashboard
    const totalTransactions = transactions.length;
    const totalPending = pendingTransactions.length;

    setTextIfExists("transaction-count", String(totalTransactions));
    setTextIfExists("pending-email-count", String(totalPending));

  } catch (error) {
    console.error("Error loading transactions:", error);
    const errorMsg = '<tr><td colspan="11" style="text-align: center; color: red;">Error loading transactions</td></tr>';
    if (approvedTableBody) approvedTableBody.innerHTML = errorMsg;
  }
}

function ensureTransactionDetailsModal() {
  const existing = document.getElementById("transactionDetailsModal");
  if (existing) return existing;
  // If modal doesn't exist, create it now (createTransactionsTableHTML binds close + finalize via addEventListener)
  console.warn("Transaction Details Modal not found. Creating it now...");
  createTransactionsTableHTML();
  return document.getElementById("transactionDetailsModal") || null;
}

window.viewTransactionDetails = async function(transactionId) {
  ensureTransactionDetailsModal();
  try {
    // Fetch transaction
    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .select("*")
      .eq("transaction_id", transactionId)
      .single();

    if (transactionError) throw transactionError;

    // Fetch transaction details
    const { data: details, error: detailsError } = await supabase
      .from("transaction_detail")
      .select("*")
      .eq("transaction_id", transactionId)
      .single();

    if (detailsError) throw detailsError;

    // Fetch all services to map service_id to service name
    const { data: services, error: servicesError } = await supabase
      .from("service_type")
      .select("*");

    if (servicesError) throw servicesError;

    // Create a map of service_id to service info
    const servicesMap = {};
    services.forEach(service => {
      servicesMap[service.service_id] = service;
    });

    let userName = "N/A";
    let userEmail = "";
    if (transaction.user_id) {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("given_name, middle_name, last_name, email_address")
        .eq("user_id", transaction.user_id)
        .single();

      if (userError) {
        console.error("Error fetching user:", userError);
      } else if (user) {
        userName = `${user.given_name} ${user.middle_name || ""} ${user.last_name}`
          .replace(/\s+/g, " ")
          .trim();
        userEmail = user.email_address || "";
      }
    }

    document.getElementById("detailTransactionId").textContent = transaction.transaction_id;
    document.getElementById("detailTransactionCode").textContent = transaction.transaction_code || "N/A";
    document.getElementById("detailUserName").textContent = userName;
    document.getElementById("detailDateTime").textContent = new Date(transaction.date_time).toLocaleString();
    document.getElementById("detailSchoolYear").textContent = transaction.school_year || "N/A";
    document.getElementById("detailTerm").textContent = transaction.term || "N/A";
    
    // Style status as a badge matching WAITING QUEUE design
    const statusEl = document.getElementById("detailStatus");
    const status = transaction.status || "N/A";
    if (statusEl) {
      // Gray badge style matching WAITING QUEUE PENDING badge
      statusEl.innerHTML = `<span style="display: inline-block; padding: 4px 12px; border-radius: 12px; background-color: #6c757d; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${status}</span>`;
    }
    
    document.getElementById("detailProcessedBy").textContent = transaction.processed_by || "Not processed yet";
    const grandTotalEl = document.getElementById("detailGrandTotal");
    if (grandTotalEl) {
      // Set grand total - ensure no duplication by clearing first
      grandTotalEl.textContent = "";
      const totalAmount = Number(details.total_amount || 0).toFixed(2);
      grandTotalEl.textContent = `₱${totalAmount}`;
    }

    const finalizeButton = document.getElementById("finalizeInvoiceBtn");
    const codeInput = document.getElementById("confirmTransactionCode");
    const codeStatus = document.getElementById("transactionCodeStatus");
    const existingCode = String(transaction.transaction_code || "").trim();
    finalizeButton.dataset.transactionId = String(transaction.transaction_id);
    finalizeButton.dataset.currentStatus = transaction.status || "";
    finalizeButton.dataset.userEmail = userEmail;
    finalizeButton.dataset.userName = userName;
    delete finalizeButton.dataset.emailSent;

    if (codeInput) {
      codeInput.value = existingCode;
      codeInput.disabled = transaction.status !== "Pending";
    }

    if (codeStatus) {
      codeStatus.textContent = "";
      codeStatus.style.color = "";
    }

    if (transaction.status !== "Pending") {
      finalizeButton.disabled = true;
      finalizeButton.textContent = "Invoice Finalized";
      finalizeButton.style.opacity = "0.7";
      finalizeButton.style.cursor = "not-allowed";
    } else {
      finalizeButton.disabled = true;
      finalizeButton.textContent = "Finalize & Send Invoice";
      finalizeButton.style.opacity = "1";
      finalizeButton.style.cursor = "pointer";
    }

    if (codeInput) {
      codeInput.oninput = () => {
        const entered = String(codeInput.value || "").trim();
        const hasValue = entered.length > 0;

        if (codeStatus) {
          if (!hasValue) {
            codeStatus.textContent = "⚠ Enter the transaction code to continue.";
            codeStatus.style.color = "#d32f2f";
            codeStatus.style.fontWeight = "600";
            codeStatus.style.backgroundColor = "transparent";
            codeStatus.style.padding = "4px 0";
            codeStatus.style.borderRadius = "0";
            codeStatus.style.border = "none";
            codeStatus.style.fontSize = "12px";
          } else {
            codeStatus.textContent = "✓ Transaction code ready.";
            codeStatus.style.color = "#388e3c";
            codeStatus.style.fontWeight = "600";
            codeStatus.style.backgroundColor = "transparent";
            codeStatus.style.padding = "4px 0";
            codeStatus.style.borderRadius = "0";
            codeStatus.style.border = "none";
            codeStatus.style.fontSize = "12px";
          }
        }

        if (transaction.status === "Pending") {
          finalizeButton.disabled = !hasValue;
        }
      };

      codeInput.oninput();
    }

    // Build order items summary + populate services table
    const servicesTableBody = document.getElementById("detailServicesTable");
    const orderItemsText = (details.services || [])
      .map((service) => {
        const serviceInfo = servicesMap[service.service_id];
        const serviceName = serviceInfo
          ? serviceInfo.servicename
          : `Service ID: ${service.service_id}`;
        return `${serviceName} x${service.quantity} (₱${Number(service.total || 0).toFixed(2)})`;
      })
      .join("\n");

    finalizeButton.dataset.orderItems = orderItemsText;

    servicesTableBody.innerHTML = (details.services || [])
      .map((service) => {
        const serviceInfo = servicesMap[service.service_id];
        const serviceName = serviceInfo
          ? serviceInfo.servicename
          : `Service ID: ${service.service_id}`;
        const unitPrice = serviceInfo
          ? serviceInfo.unitprice
          : service.total / service.quantity;
        
        return `
          <tr style="border-bottom: 1px solid #e0e0e0; transition: background-color 0.2s ease;">
            <td style="padding: 12px 16px; color: #333333; font-weight: 500; font-size: 13px;">${serviceName}</td>
            <td style="padding: 12px 16px; text-align: center; color: #333333; font-size: 13px;">${service.quantity}</td>
            <td style="padding: 12px 16px; text-align: right; color: #333333; font-size: 13px;">₱${Number(unitPrice || 0).toFixed(2)}</td>
            <td style="padding: 12px 16px; text-align: right; color: #333333; font-weight: 600; font-size: 13px;">₱${Number(service.total || 0).toFixed(2)}</td>
          </tr>
        `;
      })
      .join("");

    // Show modal
    const modal = document.getElementById("transactionDetailsModal");
    if (!modal) {
      console.error("Transaction Details Modal not found! Creating it now...");
      ensureTransactionDetailsModal();
      const createdModal = document.getElementById("transactionDetailsModal");
      if (createdModal) {
        createdModal.style.display = "block";
      } else {
        alert("Error: Could not create transaction details modal. Please refresh the page.");
        return;
      }
    } else {
      modal.style.display = "block";
    }
  } catch (error) {
    console.error("Error fetching transaction details:", error);
    const statusElement = document.getElementById("transactionCrudStatus");
    statusElement.textContent = "Error loading transaction details: " + error.message;
    statusElement.style.color = "red";
  }
}

function closeTransactionDetails() {
  document.getElementById("transactionDetailsModal").style.display = "none";
}

function getCurrentUserFromStorage() {
  const userJson = localStorage.getItem("currentUser");
  if (!userJson) {
    return null;
  }

  try {
    return JSON.parse(userJson);
  } catch (error) {
    console.error("Failed to parse current user:", error);
    return null;
  }
}

async function handleFinalizeInvoice() {
  const finalizeButton = document.getElementById("finalizeInvoiceBtn");
  if (!finalizeButton) return;
  // Prevent double execution (e.g. double-click or duplicate handlers)
  if (finalizeButton.dataset.currentStatus === "Approved") {
    return;
  }
  if (finalizeButton.disabled && finalizeButton.textContent === "Finalizing...") {
    return;
  }

  const statusElement =
    document.getElementById("transactionCrudStatus") ||
    document.getElementById("transactionCodeStatus");
  const transactionId = Number(finalizeButton.dataset.transactionId);
  const currentStatus = finalizeButton.dataset.currentStatus;
  const codeInput = document.getElementById("confirmTransactionCode");
  const enteredCode = String(codeInput?.value || "").trim();

  if (!statusElement) {
    console.warn("Missing transaction status element for finalize flow.");
  }

  if (!transactionId) {
    if (statusElement) {
    statusElement.textContent = "Missing transaction ID for processing.";
    statusElement.style.color = "red";
    }
    return;
  }

  if (currentStatus !== "Pending") {
    if (statusElement) {
    statusElement.textContent = "Only pending transactions can be processed.";
    statusElement.style.color = "red";
    }
    return;
  }

  if (!enteredCode) {
    if (statusElement) {
    statusElement.textContent = "Please enter a transaction code to finalize.";
    statusElement.style.color = "red";
    }
    return;
  }

  finalizeButton.disabled = true;
  finalizeButton.textContent = "Finalizing...";

  try {
    const currentUser = getCurrentUserFromStorage();
    const processedBy = currentUser?.user_id || null;

    const { error } = await supabase
      .from("transactions")
      .update({
        status: "Approved",
        processed_by: processedBy,
        transaction_code: enteredCode,
      })
      .eq("transaction_id", transactionId);

    if (error) throw error;

    document.getElementById("detailStatus").textContent = "Approved";
    document.getElementById("detailProcessedBy").textContent = processedBy || "N/A";
    finalizeButton.dataset.currentStatus = "Approved";
    finalizeButton.textContent = "Invoice Finalized";
    finalizeButton.style.opacity = "0.7";
    finalizeButton.style.cursor = "not-allowed";

    if (statusElement) {
    statusElement.textContent = "Transaction processed successfully.";
    statusElement.style.color = "green";
    }

    // Send email to user after approval (once only per transaction)
    try {
      const toEmail = finalizeButton.dataset.userEmail || "";
      const toName = finalizeButton.dataset.userName || "";
      const orderItems = finalizeButton.dataset.orderItems || "";
      const totalAmount = document.getElementById("detailGrandTotal")?.textContent || "";

      const alreadySent = finalizeButton.dataset.emailSent === "true";
      if (toEmail && !alreadySent) {
        await sendApprovalEmail({
          toEmail,
          toName,
          transactionId,
          transactionCode: enteredCode,
          totalAmount,
          orderItems,
        });
        finalizeButton.dataset.emailSent = "true";
      }

      if (statusElement) {
        statusElement.textContent = toEmail ? "Transaction approved and email sent." : "Transaction approved.";
        statusElement.style.color = "green";
      }
    } catch (emailErr) {
      console.error("Email send failed:", emailErr);
      // Keep approval success; only warn about email
      if (statusElement) {
        statusElement.textContent =
          "Transaction approved, but email failed: " +
          (emailErr?.message || emailErr);
        statusElement.style.color = "#ff9800";
      }
    }

    await loadTransactionsTable();
    await loadPendingQueueForDashboard();
  } catch (error) {
    console.error("Error finalizing invoice:", error);
    if (statusElement) {
      statusElement.textContent =
        "Failed to process transaction: " + error.message;
    statusElement.style.color = "red";
    }
    finalizeButton.disabled = false;
    finalizeButton.textContent = "Finalize & Send Invoice";
    finalizeButton.style.opacity = "1";
    finalizeButton.style.cursor = "pointer";
  }
}

async function loadAdminReports() {
  const summaryTotalEl = document.getElementById("reportTotalAmount");
  const summaryCountEl = document.getElementById("reportTotalCount");
  const summaryAvgEl = document.getElementById("reportAvgAmount");
  const chartCanvas = document.getElementById("reportDailyChart");

  if (!summaryTotalEl || !summaryCountEl || !summaryAvgEl || !chartCanvas) {
    return;
  }

  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-based

    const firstDay = new Date(Date.UTC(year, month, 1)).toISOString();
    const lastDay = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59)).toISOString();

    // Fetch approved transactions for this month
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("status", "Approved")
      .gte("date_time", firstDay)
      .lte("date_time", lastDay);

    if (txError) {
      console.error("Error loading report transactions:", txError);
      return;
    }

    if (!transactions || transactions.length === 0) {
      summaryTotalEl.textContent = "₱0.00";
      summaryCountEl.textContent = "0";
      summaryAvgEl.textContent = "₱0.00";
      return;
    }

    const txIds = transactions.map((t) => t.transaction_id);

    const { data: details, error: detailError } = await supabase
      .from("transaction_detail")
      .select("transaction_id,total_amount")
      .in("transaction_id", txIds);

    if (detailError) {
      console.error("Error loading report details:", detailError);
      return;
    }

    const amountByTxId = {};
    (details || []).forEach((d) => {
      amountByTxId[d.transaction_id] = d.total_amount || 0;
    });

    const amounts = transactions.map(
      (tx) => amountByTxId[tx.transaction_id] || 0
    );

    const totalAmount = amounts.reduce((sum, v) => sum + v, 0);
    const count = amounts.length;
    const avg = count > 0 ? totalAmount / count : 0;

    summaryTotalEl.textContent = `₱${totalAmount.toFixed(2)}`;
    summaryCountEl.textContent = String(count);
    summaryAvgEl.textContent = `₱${avg.toFixed(2)}`;

    // Daily totals
    const dailyMap = {};
    transactions.forEach((tx) => {
      const dateKey = tx.date_time
        ? new Date(tx.date_time).toISOString().slice(0, 10)
        : "";
      if (!dateKey) return;
      const amt = amountByTxId[tx.transaction_id] || 0;
      dailyMap[dateKey] = (dailyMap[dateKey] || 0) + amt;
    });

    const dates = Object.keys(dailyMap).sort();
    const dailyValues = dates.map((d) => dailyMap[d]);

    if (window.Chart && chartCanvas) {
      const ctx = chartCanvas.getContext("2d");
      // eslint-disable-next-line no-unused-vars
      const chart = new Chart(ctx, {
        type: "line",
        data: {
          labels: dates,
          datasets: [
            {
              label: "Approved Amount per Day",
              data: dailyValues,
              borderColor: "#007bff",
              backgroundColor: "rgba(0, 123, 255, 0.2)",
              tension: 0.3,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: true } },
        },
      });
    }

    // CSV export button
    const exportBtn = document.getElementById("exportTxReportCsvBtn");
    if (exportBtn) {
      exportBtn.onclick = () => {
        let csv = "data:text/csv;charset=utf-8,\uFEFF";
        csv += "Transaction ID,Transaction Code,Date,Amount,Status\n";
        transactions.forEach((tx) => {
          const dateStr = tx.date_time
            ? new Date(tx.date_time).toISOString()
            : "";
          const amt = amountByTxId[tx.transaction_id] || 0;
          csv += `${tx.transaction_id},${tx.transaction_code || ""},${dateStr},${amt.toFixed(
            2
          )},${tx.status || ""}\n`;
        });

        const encoded = encodeURI(csv);
        const link = document.createElement("a");
        link.href = encoded;
        link.download = `approved_transactions_${year}-${String(
          month + 1
        ).padStart(2, "0")}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };
    }
  } catch (err) {
    console.error("Error loading admin reports:", err);
  }
}

async function loadUsersTable() {
  const tableBody = document.getElementById("usersTableBody");
  if (!tableBody) return;

  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .order("user_id", { ascending: true });

    if (error) {
      console.error("Error fetching users:", error);
      tableBody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: red;">Error loading users</td></tr>';
      return;
    }

    if (!users || users.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="10" style="text-align: center;">No users found</td></tr>';
      return;
    }

    tableBody.innerHTML = users
      .map(
        (user) => `
            <tr>
                <td>${user.user_id || "N/A"}</td>
                <td>${user.given_name || "N/A"}</td>
                <td>${user.middle_name || "N/A"}</td>
                <td>${user.last_name || "N/A"}</td>
                <td>${user.email_address || "N/A"}</td>
                <td>${user.role || "N/A"}</td>
                <td>${user.program || "N/A"}</td>
                <td>${user.year || "N/A"}</td>
                <td>${user.department || "N/A"}</td>
                <td>
                    <button onclick="editUser('${user.user_id}')" style="background-color: #2196F3; color: white; padding: 5px 10px; border: none; border-radius: 3px; cursor: pointer; margin-right: 5px;">Edit</button>
                    <button onclick="deleteUser('${user.user_id}')" style="background-color: #f44336; color: white; padding: 5px 10px; border: none; border-radius: 3px; cursor: pointer;">Delete</button>
                </td>
            </tr>
        `
      )
      .join("");
  } catch (error) {
    console.error("Error loading users:", error);
    tableBody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: red;">Error loading users</td></tr>';
  }
}

async function loadServiceTypesTable() {
  const tableBody = document.getElementById("serviceTypesTableBody");

  try {
    const { data: services, error } = await supabase
      .from("service_type")
      .select("*")
      .order("service_id", { ascending: true });

    if (error) {
      console.error("Error fetching service types:", error);
      tableBody.innerHTML =
        '<tr><td colspan="4" style="text-align: center; color: red;">Error loading service types</td></tr>';
      return;
    }

    if (!services || services.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="4" style="text-align: center;">No service types found</td></tr>';
      return;
    }

    tableBody.innerHTML = services
      .map(
        (service) => `
          <tr>
            <td>${service.service_id || "N/A"}</td>
            <td>${service.servicename || "N/A"}</td>
            <td>₱${Number(service.unitprice || 0).toFixed(2)}</td>
            <td>
              <button onclick="editServiceType('${service.service_id}')" style="background-color: #2196F3; color: white; padding: 5px 10px; border: none; border-radius: 3px; cursor: pointer; margin-right: 5px;">Edit</button>
              <button onclick="deleteServiceType('${service.service_id}')" style="background-color: #f44336; color: white; padding: 5px 10px; border: none; border-radius: 3px; cursor: pointer;">Delete</button>
            </td>
          </tr>
        `
      )
      .join("");
  } catch (error) {
    console.error("Error loading service types:", error);
    tableBody.innerHTML =
      '<tr><td colspan="4" style="text-align: center; color: red;">Error loading service types</td></tr>';
  }
}

function openAddUserForm() {
  document.getElementById("formTitle").textContent = "Add New User";
  document.getElementById("userForm").reset();
  document.getElementById("formUserId").value = "";
  document.getElementById("userFormModal").style.display = "block";
}

function openAddServiceTypeForm() {
  document.getElementById("serviceTypeFormTitle").textContent =
    "Add Service Type";
  document.getElementById("serviceTypeForm").reset();
  document.getElementById("serviceTypeId").value = "";
  document.getElementById("serviceTypeFormModal").style.display = "block";
}

function closeUserForm() {
  document.getElementById("userFormModal").style.display = "none";
  document.getElementById("userForm").reset();
}

function closeServiceTypeForm() {
  document.getElementById("serviceTypeFormModal").style.display = "none";
  document.getElementById("serviceTypeForm").reset();
}

async function handleUserFormSubmit(e) {
  e.preventDefault();
  const statusElement = document.getElementById("crudStatus");
  
  const userId = document.getElementById("formUserId").value;
  const userData = {
    given_name: document.getElementById("formGivenName").value,
    middle_name: document.getElementById("formMiddleName").value || null,
    last_name: document.getElementById("formLastName").value,
    email_address: document.getElementById("formEmail").value,
    role: document.getElementById("formRole").value,
    program: document.getElementById("formProgram").value || null,
    year: document.getElementById("formYear").value || null,
    department: document.getElementById("formDepartment").value || null,
  };
  
  try {
    if (userId) {
      // Update existing user
      const { error } = await supabase
        .from("users")
        .update(userData)
        .eq("user_id", userId);
      
      if (error) throw error;
      
      statusElement.textContent = "User updated successfully!";
      statusElement.style.color = "green";
    } else {
      // Create new user
      const { error } = await supabase
        .from("users")
        .insert([userData]);
      
      if (error) throw error;
      
      statusElement.textContent = "User created successfully!";
      statusElement.style.color = "green";
    }
    
    closeUserForm();
    loadUsersTable();
    
    setTimeout(() => {
      statusElement.textContent = "";
    }, 3000);
  } catch (error) {
    console.error("Error saving user:", error);
    statusElement.textContent = "Error: " + error.message;
    statusElement.style.color = "red";
  }
}

async function handleServiceTypeFormSubmit(e) {
  e.preventDefault();
  const statusElement = document.getElementById("serviceTypeStatus");

  const serviceId = document.getElementById("serviceTypeId").value;
  const serviceData = {
    servicename: document.getElementById("serviceTypeName").value,
    unitprice: Number(document.getElementById("serviceTypePrice").value),
  };

  try {
    if (serviceId) {
      const { error } = await supabase
        .from("service_type")
        .update(serviceData)
        .eq("service_id", serviceId);

      if (error) throw error;

      statusElement.textContent = "Service type updated successfully!";
      statusElement.style.color = "green";
    } else {
      const { error } = await supabase
        .from("service_type")
        .insert([serviceData]);

      if (error) throw error;

      statusElement.textContent = "Service type created successfully!";
      statusElement.style.color = "green";
    }

    closeServiceTypeForm();
    loadServiceTypesTable();
    loadServices();

    setTimeout(() => {
      statusElement.textContent = "";
    }, 3000);
  } catch (error) {
    console.error("Error saving service type:", error);
    statusElement.textContent = "Error: " + error.message;
    statusElement.style.color = "red";
  }
}

window.editUser = async function(userId) {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (error) throw error;
    
    document.getElementById("formTitle").textContent = "Edit User";
    document.getElementById("formUserId").value = user.user_id;
    document.getElementById("formGivenName").value = user.given_name || "";
    document.getElementById("formMiddleName").value = user.middle_name || "";
    document.getElementById("formLastName").value = user.last_name || "";
    document.getElementById("formEmail").value = user.email_address || "";
    document.getElementById("formRole").value = user.role || "";
    document.getElementById("formProgram").value = user.program || "";
    document.getElementById("formYear").value = user.year || "";
    document.getElementById("formDepartment").value = user.department || "";
    
    document.getElementById("userFormModal").style.display = "block";
  } catch (error) {
    console.error("Error fetching user:", error);
    const statusElement = document.getElementById("crudStatus");
    statusElement.textContent = "Error loading user data: " + error.message;
    statusElement.style.color = "red";
  }
}

window.editServiceType = async function(serviceId) {
  try {
    const { data: service, error } = await supabase
      .from("service_type")
      .select("*")
      .eq("service_id", serviceId)
      .single();

    if (error) throw error;

    document.getElementById("serviceTypeFormTitle").textContent =
      "Edit Service Type";
    document.getElementById("serviceTypeId").value = service.service_id;
    document.getElementById("serviceTypeName").value = service.servicename || "";
    document.getElementById("serviceTypePrice").value =
      service.unitprice ?? "";

    document.getElementById("serviceTypeFormModal").style.display = "block";
  } catch (error) {
    console.error("Error fetching service type:", error);
    const statusElement = document.getElementById("serviceTypeStatus");
    statusElement.textContent = "Error loading service type: " + error.message;
    statusElement.style.color = "red";
  }
}

window.deleteUser = async function(userId) {
  if (!confirm("Are you sure you want to delete this user?")) {
    return;
  }
  
  const statusElement = document.getElementById("crudStatus");
  
  try {
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("user_id", userId);
    
    if (error) throw error;
    
    statusElement.textContent = "User deleted successfully!";
    statusElement.style.color = "green";
    
    loadUsersTable();
    
    setTimeout(() => {
      statusElement.textContent = "";
    }, 3000);
  } catch (error) {
    console.error("Error deleting user:", error);
    statusElement.textContent = "Error deleting user: " + error.message;
    statusElement.style.color = "red";
  }
}

window.deleteServiceType = async function(serviceId) {
  if (!confirm("Are you sure you want to delete this service type?")) {
    return;
  }

  const statusElement = document.getElementById("serviceTypeStatus");

  try {
    const { error } = await supabase
      .from("service_type")
      .delete()
      .eq("service_id", serviceId);

    if (error) throw error;

    statusElement.textContent = "Service type deleted successfully!";
    statusElement.style.color = "green";

    loadServiceTypesTable();
    loadServices();

    setTimeout(() => {
      statusElement.textContent = "";
    }, 3000);
  } catch (error) {
    console.error("Error deleting service type:", error);
    statusElement.textContent = "Error deleting service type: " + error.message;
    statusElement.style.color = "red";
  }
}

async function submitTransaction(user, statusElement) {
  try {
    const checkboxes = document.querySelectorAll(
      'input[name="service"]:checked'
    );

    if (checkboxes.length === 0) {
      if (typeof window.showErrorMessage === "function") {
        window.showErrorMessage("Please select at least one service");
      } else {
        alert("Please select at least one service");
      }
      return false;
    }

    const selectedServices = [];
    let totalAmount = 0;

    checkboxes.forEach((checkbox) => {
      const serviceId = parseInt(checkbox.value);
      const price = parseFloat(checkbox.dataset.price);
      const quantity = parseInt(
        document.getElementById(`quantity_${serviceId}`).value
      );

      if (quantity > 0) {
        const subtotal = price * quantity;

        selectedServices.push({
          service_id: serviceId,
          quantity: quantity,
          total: subtotal,
        });

        totalAmount += subtotal;
      }
    });

    if (selectedServices.length === 0) {
      if (typeof window.showErrorMessage === "function") {
        window.showErrorMessage("Please enter quantity for at least one service");
      } else {
        alert("Please enter quantity for at least one service");
      }
      return false;
    }

    statusElement.textContent = "Processing transaction...";
    statusElement.style.color = "blue";

    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.user_id,
        date_time: new Date().toISOString(),
        school_year: getCurrentSchoolYear(),
        term: getCurrentTerm(),
        processed_by: null, // iseset ng admin kapag na-approve
        status: "Pending",
      })
      .select()
      .single();

    if (transactionError) {
      throw new Error(
        "Failed to create transaction: " + transactionError.message
      );
    }

    const { error: detailsError } = await supabase
      .from("transaction_detail")
      .insert({
        transaction_id: transaction.transaction_id,
        services: selectedServices,
        total_amount: totalAmount,
      });

    if (detailsError) {
      throw new Error(
        "Failed to save transaction details: " + detailsError.message
      );
    }

    console.log("Transaction submitted successfully!");
    console.log("Transaction ID:", transaction.transaction_id);
    console.log("Status:", transaction.status);
    console.log("Total Amount:", totalAmount);
    console.log("Services:", selectedServices);

    statusElement.textContent = `Transaction submitted successfully! Status: Pending approval. Total: ₱${totalAmount.toFixed(
      2
    )}`;
    statusElement.style.color = "green";

    document.getElementById("serviceForm").reset();
    document.querySelectorAll('input[type="number"]').forEach((input) => {
      input.disabled = true;
    });

    return true; 
  } catch (error) {
    console.error("Transaction error:", error);
    statusElement.textContent = "Transaction failed: " + error.message;
    statusElement.style.color = "red";
    return false; 
  }
}



function resetServices() {

  document.querySelectorAll('input[name="service"]').forEach((checkbox) => {
    checkbox.checked = false;
    const serviceId = checkbox.value;
    const quantityInput = document.getElementById(`quantity_${serviceId}`);
    if (quantityInput) {
      quantityInput.disabled = true;
      quantityInput.value = 0;
    }
  });

 
  const serviceForm = document.getElementById("serviceForm");
  if (serviceForm) {
    serviceForm.reset();
  }


  const totalAmountInput = document.getElementById("totalAmount");
  if (totalAmountInput) {
    totalAmountInput.value = "0.00";
  }

 
  const status = document.getElementById("status");
  if (status) {
    status.textContent = "";
  }
}

function updateTotalAmount() {
  const totalAmountInput = document.getElementById("totalAmount");
  if (!totalAmountInput) return;

  const checkboxes = document.querySelectorAll('input[name="service"]:checked');
  let total = 0;

  checkboxes.forEach((checkbox) => {
    const serviceId = parseInt(checkbox.value, 10);
    const price = parseFloat(checkbox.dataset.price);
    const quantityInput = document.getElementById(`quantity_${serviceId}`);
    const quantity = parseInt(quantityInput?.value || "0", 10);

    if (quantity > 0) {
      total += price * quantity;
    }
  });

  totalAmountInput.value = total.toFixed(2);
}

async function initTransactionDetailsPage() {
  const userJson = localStorage.getItem("currentUser");
  if (!userJson) {
    window.location.href = "index.html";
    return;
  }

  const user = JSON.parse(userJson);
  const status = document.getElementById("tdStatus");

 
  const pendingJson = localStorage.getItem("pendingTransaction");
  if (!pendingJson) {
    if (status) {
      status.textContent = "No pending transaction found.";
      status.className = "status-message error";
      status.style.display = "block";
    }
    return;
  }

  const pending = JSON.parse(pendingJson);

  
  setTextIfExists("tdUserId", user.user_id || "N/A");
  setTextIfExists("tdLastName", user.last_name || "N/A");
  setTextIfExists("tdGivenName", user.given_name || "N/A");
  setTextIfExists("tdMiddleName", user.middle_name || "N/A");
  setTextIfExists("tdProgram", user.program || "N/A");
  setTextIfExists("tdYear", user.year || "N/A");
  setTextIfExists("tdSchoolYear", getCurrentSchoolYear());
  setTextIfExists("tdTerm", getCurrentTerm());
  setTextIfExists(
    "tdDateTime",
    pending.createdAt ? new Date(pending.createdAt).toLocaleString() : "N/A"
  );

  const statusTextEl = document.getElementById("tdStatusText");
  if (statusTextEl) {
    // Check if this is inline view or separate page
    const isInlineView = statusTextEl.closest("#transaction-details-view") !== null;
    const badgeClass = isInlineView ? "transaction-status-badge" : "status-badge";
    statusTextEl.innerHTML = `<span class="${badgeClass} pending">Pending</span>`;
  }

  setTextIfExists("tdProcessedBy", "Not yet processed");

  const services = pending.services || [];
  const totalAmount = pending.totalAmount || 0;

  setTextIfExists("tdTotalAmount", `₱${Number(totalAmount).toFixed(2)}`);

  try {
    const servicesContainer = document.getElementById("tdServices");
    if (servicesContainer && services.length > 0) {
      const serviceIds = services.map((s) => s.service_id);

      const { data: serviceTypes, error: svcError } = await supabase
        .from("service_type")
        .select("*")
        .in("service_id", serviceIds);

      if (svcError) {
        console.error("Error fetching service types:", svcError);
        servicesContainer.textContent = "Error loading services.";
      } else {
        const mapById = {};
        (serviceTypes || []).forEach((svc) => {
          mapById[svc.service_id] = svc;
        });

        servicesContainer.innerHTML = "";

        // Check if this is the inline dashboard view or separate page
        const isInlineView = servicesContainer.closest("#transaction-details-view") !== null;
        const itemClass = isInlineView ? "transaction-service-item" : "service-item";
        const nameClass = isInlineView ? "transaction-service-name" : "service-name";
        const detailsClass = isInlineView ? "transaction-service-details" : "service-details";
        const totalClass = isInlineView ? "transaction-service-total" : "service-total";

        services.forEach((item) => {
          const svc = mapById[item.service_id];
          const name = svc ? svc.servicename : `Service ${item.service_id}`;
          const price = svc ? svc.unitprice : 0;
          const total = Number(item.total).toFixed(2);

          const serviceDiv = document.createElement("div");
          serviceDiv.className = itemClass;
          serviceDiv.innerHTML = `
            <div>
              <div class="${nameClass}">${name}</div>
              <div class="${detailsClass}">Qty: ${item.quantity} × ₱${Number(price).toFixed(2)}</div>
            </div>
            <div class="${totalClass}">₱${total}</div>
          `;
          servicesContainer.appendChild(serviceDiv);
        });
      }
    }

    const goBackBtn = document.getElementById("transactionDetailsGoBackBtn");
    if (goBackBtn) {
      goBackBtn.addEventListener("click", () => {
        if (hasInlineDashboardViews()) {
          switchDashboardView("services");
        } else {
          window.location.href = "dashboard.html";
        }
      });
    }

    const confirmBtn = document.getElementById("confirmTransactionBtn");
    const submitTransactionModal = document.getElementById("submitTransactionModal");
    const submitTransactionOkBtn = document.getElementById("submitTransactionModalOkBtn");
    const submitTransactionCancelBtn = document.getElementById("submitTransactionModalCancelBtn");
    const submitTransactionCloseBtn = document.getElementById("submitTransactionModalCloseBtn");

    function closeSubmitTransactionModal() {
      if (submitTransactionModal) submitTransactionModal.style.display = "none";
    }

    if (confirmBtn) {
      confirmBtn.addEventListener("click", () => {
        if (submitTransactionModal) submitTransactionModal.style.display = "flex";
      });
    }

    if (submitTransactionOkBtn && !submitTransactionOkBtn.dataset.submitBound) {
      submitTransactionOkBtn.dataset.submitBound = "true";
      submitTransactionOkBtn.addEventListener("click", async () => {
        const statusEl = document.getElementById("tdStatus");
        const statusTextEl = document.getElementById("tdStatusText");
        closeSubmitTransactionModal();
        const userJson = localStorage.getItem("currentUser");
        const pendingJson = localStorage.getItem("pendingTransaction");
        if (!userJson || !pendingJson) {
          if (statusEl) {
            statusEl.textContent = "No pending transaction to submit.";
            statusEl.style.display = "block";
          }
          return;
        }
        const currentUser = JSON.parse(userJson);
        const currentPending = JSON.parse(pendingJson);
        submitTransactionOkBtn.disabled = true;
        const result = await submitPendingTransaction(
          currentUser,
          currentPending,
          statusEl || document.body
        );
        submitTransactionOkBtn.disabled = false;
        if (result && result.success && result.transaction) {
          localStorage.removeItem("pendingTransaction");
          if (statusTextEl) {
            statusTextEl.innerHTML = '<span class="status-badge approved">Submitted</span>';
          }
          if (statusEl) {
            statusEl.style.display = "none";
          }
          await showReceiptPopup(currentUser, currentPending, result.transaction);
        }
      });
    }


    if (submitTransactionCancelBtn) submitTransactionCancelBtn.addEventListener("click", closeSubmitTransactionModal);
    if (submitTransactionCloseBtn) submitTransactionCloseBtn.addEventListener("click", closeSubmitTransactionModal);
  } catch (err) {
    console.error("Unexpected error loading transaction details:", err);
    if (status) {
      status.textContent = "Unexpected error loading transaction details.";
    }
  }
}

let submitPendingTransactionInFlight = false;

async function submitPendingTransaction(user, pending, statusElement) {
  if (submitPendingTransactionInFlight) {
    console.warn("[Submit] Ignoring duplicate submit call.");
    return false;
  }
  submitPendingTransactionInFlight = true;
  try {
    const selectedServices = pending.services || [];
    const totalAmount = pending.totalAmount || 0;

    if (!selectedServices.length || totalAmount <= 0) {
      if (statusElement && statusElement.classList) {
        statusElement.textContent = "Invalid pending transaction.";
        statusElement.className = "status-message error";
        statusElement.style.display = "block";
      } else {
      statusElement.textContent = "Invalid pending transaction.";
      statusElement.style.color = "red";
      }
      return false;
    }

    if (statusElement && statusElement.classList) {
      statusElement.textContent = "Processing transaction...";
      statusElement.className = "status-message";
      statusElement.style.display = "block";
      statusElement.style.background = "#fff3cd";
      statusElement.style.color = "#856404";
      statusElement.style.border = "1px solid #ffc107";
    } else {
    statusElement.textContent = "Processing transaction...";
    statusElement.style.color = "blue";
    }

    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.user_id,
        date_time: new Date().toISOString(),
        school_year: getCurrentSchoolYear(),
        term: getCurrentTerm(),
        processed_by: null,
        status: "Pending",
      })
      .select()
      .single();

    if (transactionError) {
      throw new Error(
        "Failed to create transaction: " + transactionError.message
      );
    }

    const { error: detailsError } = await supabase
      .from("transaction_detail")
      .insert({
        transaction_id: transaction.transaction_id,
        services: selectedServices,
        total_amount: totalAmount,
      });

    if (detailsError) {
      throw new Error(
        "Failed to save transaction details: " + detailsError.message
      );
    }

    console.log("Transaction submitted successfully!", transaction);
    if (statusElement && statusElement.classList) {
      statusElement.textContent = "Transaction submitted successfully!";
      statusElement.className = "status-message success";
      statusElement.style.display = "block";
    } else {
    statusElement.textContent = "Transaction submitted successfully!";
    statusElement.style.color = "green";
    }
    return { success: true, transaction };
  } catch (error) {
    console.error("Transaction error:", error);
    if (statusElement && statusElement.classList) {
      statusElement.textContent = "Transaction failed: " + error.message;
      statusElement.className = "status-message error";
      statusElement.style.display = "block";
    } else {
    statusElement.textContent = "Transaction failed: " + error.message;
    statusElement.style.color = "red";
    }
    return { success: false };
  } finally {
    submitPendingTransactionInFlight = false;
  }
}

async function showReceiptPopup(user, pending, transaction, options) {
  const overlay = document.getElementById("success-notice");
  if (!overlay) return;
  const dateEl = document.getElementById("receipt-date");
  const txIdEl = document.getElementById("receipt-tx-id");
  const nameEl = document.getElementById("receipt-customer-name");
  const listEl = document.getElementById("receipt-items-list");
  const totalEl = document.getElementById("receipt-total");
  if (dateEl) dateEl.textContent = transaction?.date_time ? new Date(transaction.date_time).toLocaleString() : new Date().toLocaleString();
  if (txIdEl) txIdEl.textContent = transaction?.transaction_id != null ? String(transaction.transaction_id) : "-";
  const customerName = [user.given_name, user.middle_name, user.last_name].filter(Boolean).join(" ").trim() || "N/A";
  if (nameEl) nameEl.textContent = customerName;
  const totalAmount = pending?.totalAmount ?? 0;
  if (totalEl) totalEl.textContent = "₱" + Number(totalAmount).toFixed(2);

  const services = pending?.services || [];
  const serviceIds = [...new Set(services.map((s) => s.service_id).filter(Boolean))];
  let serviceNames = {};
  if (serviceIds.length > 0) {
    const { data: serviceTypes } = await supabase.from("service_type").select("service_id,servicename").in("service_id", serviceIds);
    (serviceTypes || []).forEach((s) => { serviceNames[s.service_id] = s.servicename || "Service"; });
  }
  if (listEl) {
    listEl.innerHTML = services
      .map(
        (item) => {
          const name = serviceNames[item.service_id] || "Item";
          const qty = item.quantity || 0;
          const lineTotal = item.total != null ? Number(item.total) : 0;
          return `
            <div class="receipt-item-row">
              <span class="receipt-col-desc">${name}</span>
              <span class="receipt-col-qty" style="text-align:center">${qty}</span>
              <span class="receipt-col-amount" style="text-align:right">₱${lineTotal.toFixed(2)}</span>
            </div>`;
        }
      )
      .join("");
  }
  const listPanel = document.getElementById("receipt-overlay-list-panel");
  const receiptPanel = document.getElementById("receipt-overlay-receipt-panel");
  if (listPanel) listPanel.style.display = "none";
  if (receiptPanel) receiptPanel.style.display = "block";
  overlay.style.display = "flex";

  const backBtn = document.getElementById("receipt-back-to-list-btn");
  if (backBtn) {
    if (options && options.fromList) {
      backBtn.style.display = "block";
      backBtn.onclick = () => {
        listPanel.style.display = "block";
        receiptPanel.style.display = "none";
        backBtn.style.display = "none";
      };
    } else {
      backBtn.style.display = "none";
    }
  }
}

async function showTransactionListPopup() {
  const overlay = document.getElementById("success-notice");
  if (!overlay) return;
  const userJson = localStorage.getItem("currentUser");
  if (!userJson) {
    window.location.href = "index.html";
    return;
  }
  const user = JSON.parse(userJson);
  const { data: transactions, error: txError } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.user_id)
    .order("date_time", { ascending: false });
  const listPanel = document.getElementById("receipt-overlay-list-panel");
  const receiptPanel = document.getElementById("receipt-overlay-receipt-panel");
  const tbody = document.getElementById("receipt-overlay-list-tbody");
  const emptyEl = document.getElementById("receipt-overlay-list-empty");
  const tableWrap = listPanel?.querySelector(".receipt-list-table-wrap");
  if (listPanel) listPanel.style.display = "block";
  if (receiptPanel) receiptPanel.style.display = "none";
  overlay.style.display = "flex";

  if (txError || !transactions || transactions.length === 0) {
    if (tbody) tbody.innerHTML = "";
    if (emptyEl) emptyEl.style.display = "block";
    if (tableWrap) tableWrap.style.display = "none";
    return;
  }
  if (emptyEl) emptyEl.style.display = "none";
  if (tableWrap) tableWrap.style.display = "block";
  const txIds = transactions.map((t) => t.transaction_id);
  const { data: details } = await supabase
    .from("transaction_detail")
    .select("transaction_id,total_amount")
    .in("transaction_id", txIds);
  const totalByTx = {};
  (details || []).forEach((d) => { totalByTx[d.transaction_id] = d.total_amount ?? 0; });
  overlay._lastTransactionListUser = user;
  overlay._lastTransactionList = transactions;
  if (tbody) {
    tbody.innerHTML = transactions
      .map(
        (tx) => {
          const dateStr = tx.date_time ? new Date(tx.date_time).toLocaleString() : "-";
          const total = totalByTx[tx.transaction_id] ?? 0;
          const status = tx.status || "Pending";
          return `<tr data-transaction-id="${tx.transaction_id}"><td>${dateStr}</td><td>${tx.transaction_id}</td><td>${status}</td><td>₱${Number(total).toFixed(2)}</td></tr>`;
        }
      )
      .join("");
  }
  if (!listPanel.dataset.listClickBound) {
    listPanel.dataset.listClickBound = "1";
    listPanel.addEventListener("click", async (e) => {
      const row = e.target.closest("tr[data-transaction-id]");
      if (!row) return;
      const ov = document.getElementById("success-notice");
      const u = ov?._lastTransactionListUser;
      const txList = ov?._lastTransactionList;
      if (!u || !txList) return;
      const transactionId = Number(row.dataset.transactionId);
      const transaction = txList.find((t) => t.transaction_id === transactionId);
      if (!transaction) return;
      const { data: detail } = await supabase
        .from("transaction_detail")
        .select("*")
        .eq("transaction_id", transactionId)
        .maybeSingle();
      const pending = !detail
        ? { services: [], totalAmount: 0 }
        : { services: detail.services || [], totalAmount: detail.total_amount ?? 0 };
      await showReceiptPopup(u, pending, transaction, { fromList: true });
    });
  }
}

async function showReceiptForLatestTransaction() {
  await showTransactionListPopup();
}

async function initTransactionStatusPage() {
  console.log("[TxStatus] initTransactionStatusPage called");
  const userJson = localStorage.getItem("currentUser");
  if (!userJson) {
    console.warn("[TxStatus] No currentUser in localStorage, redirecting to index");
    window.location.href = "index.html";
    return;
  }

  const user = JSON.parse(userJson);
  const listContainer = document.getElementById("txStatusList");
  const messageEl = document.getElementById("txStatusMessage");
  const goBackBtn = document.getElementById("goBackToDashboardBtn");
  const queuePositionBox = document.getElementById("txQueuePositionBox");

  console.log("[TxStatus] DOM elements:", {
    txStatusList: !!listContainer,
    txStatusMessage: !!messageEl,
    goBackToDashboardBtn: !!goBackBtn,
    txQueuePositionBox: !!queuePositionBox,
    statusView: !!document.getElementById("transaction-status-view"),
  });
  if (!listContainer) {
    console.error("[TxStatus] txStatusList not found — receipts cannot render. Check that #txStatusList exists on this page.");
  }

  if (goBackBtn) {
    goBackBtn.addEventListener("click", () => {
      if (hasInlineDashboardViews()) {
        switchDashboardView("services");
      } else {
        window.location.href = "dashboard.html";
      }
    });
  }

  try {

    let queueText = "";
    const { data: pendingCustomer, error: pendingError } = await supabase
      .from("transactions")
      .select("transaction_id,user_id,status,date_time")
      .eq("status", "Pending")
      .order("date_time", { ascending: true });

    if (!pendingError && pendingCustomer && pendingCustomer.length > 0) {
      const userPending = pendingCustomer.filter(
        (tx) => tx.user_id === user.user_id
      );
      if (userPending.length > 0) {
        const latestUserPending = userPending[userPending.length - 1];
        const indexInQueue = pendingCustomer.findIndex(
          (tx) => tx.transaction_id === latestUserPending.transaction_id
        );
        if (indexInQueue !== -1) {
          const position = indexInQueue + 1;
          queueText = `You are in line: #${position}`;
        }
      }
    }

    const queuePositionBox = document.getElementById("txQueuePositionBox");
    const queuePositionText = document.getElementById("txQueuePositionText");
    if (queueText && queuePositionBox && queuePositionText) {
      queuePositionText.textContent = queueText;
      queuePositionBox.style.display = "block";
    } else if (queuePositionBox) {
      queuePositionBox.style.display = "none";
    }
    if (messageEl) {
      messageEl.style.display = "none";
    }

    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.user_id)
      .order("date_time", { ascending: false });

    if (txError) {
      console.error("[TxStatus] Error fetching transactions:", txError);
      if (messageEl) {
        messageEl.textContent = "Error loading transactions.";
      }
      return;
    }

    if (!transactions || transactions.length === 0) {
      console.log("[TxStatus] No transactions for user", user.user_id);
      if (messageEl) {
        messageEl.textContent = "No transactions found.";
        messageEl.style.display = "block";
      }
      if (listContainer) listContainer.innerHTML = "";
      return;
    }
    console.log("[TxStatus] Loaded", transactions.length, "transaction(s)");

    const txIds = transactions.map((t) => t.transaction_id);

    
    const { data: details, error: detailError } = await supabase
      .from("transaction_detail")
      .select("*")
      .in("transaction_id", txIds);

    if (detailError) {
      console.error("[TxStatus] Error fetching transaction details:", detailError);
      if (messageEl) {
        messageEl.textContent = "Error loading transaction details.";
      }
      return;
    }

    const detailByTxId = {};
    (details || []).forEach((d) => {
      detailByTxId[d.transaction_id] = d;
    });

    // Collect all service IDs used across all transactions
    const allServiceIdsSet = new Set();
    (details || []).forEach((d) => {
      (d.services || []).forEach((s) => {
        allServiceIdsSet.add(s.service_id);
      });
    });

    let serviceTypeById = {};
    if (allServiceIdsSet.size > 0) {
      const allServiceIds = Array.from(allServiceIdsSet);

      const { data: serviceTypes, error: svcError } = await supabase
        .from("service_type")
        .select("*")
        .in("service_id", allServiceIds);

      if (svcError) {
        console.error("Error fetching service types:", svcError);
      } else {
        (serviceTypes || []).forEach((svc) => {
          serviceTypeById[svc.service_id] = svc;
        });
      }
    }

    if (!listContainer) return;

    const fragment = document.createDocumentFragment();

    transactions.forEach((tx) => {
      const detail = detailByTxId[tx.transaction_id];
      const services = detail?.services || [];
      const totalAmount = detail?.total_amount ?? 0;

      const wrapper = document.createElement("div");
      wrapper.className = "tx-status-item";

      const titleRow = document.createElement("div");
      titleRow.className = "tx-receipt-title-row";
      const receiptLogo = document.createElement("img");
      receiptLogo.src = "mapua_logo.png";
      receiptLogo.alt = "Mapua";
      receiptLogo.className = "tx-receipt-logo";
      const receiptTitle = document.createElement("span");
      receiptTitle.className = "tx-receipt-title";
      receiptTitle.textContent = "MAPUA LIBRARY — RECEIPT";
      titleRow.appendChild(receiptLogo);
      titleRow.appendChild(receiptTitle);
      wrapper.appendChild(titleRow);

      const header = document.createElement("p");
      header.className = "tx-status-header";
      header.textContent = `Tx #${tx.transaction_id}  |  User: ${tx.user_id}\nProcessed by: ${tx.processed_by || "N/A"}  |  Status: ${tx.status || "N/A"}\nDate: ${tx.date_time ? new Date(tx.date_time).toLocaleString() : "N/A"}`;
      wrapper.appendChild(header);

      const servicesTitle = document.createElement("p");
      servicesTitle.className = "tx-status-services-title";
      servicesTitle.textContent = "Services:";
      wrapper.appendChild(servicesTitle);

      if (services.length > 0) {
        const ul = document.createElement("ul");
        ul.className = "tx-receipt-list";
        services.forEach((item) => {
          const li = document.createElement("li");
          const svc = serviceTypeById[item.service_id];
          const name = svc ? svc.servicename : `Service ${item.service_id}`;
          const price = svc ? svc.unitprice : "";
          li.textContent = `${name}  Qty: ${item.quantity}  × ₱${Number(price).toFixed(2)}  = ₱${Number(item.total).toFixed(2)}`;
          ul.appendChild(li);
        });
        wrapper.appendChild(ul);
      } else {
        const noServices = document.createElement("p");
        noServices.textContent = "No services recorded.";
        wrapper.appendChild(noServices);
      }

      const totalP = document.createElement("p");
      totalP.className = "tx-status-total";
      totalP.textContent = `TOTAL: ₱${Number(totalAmount).toFixed(2)}`;
      wrapper.appendChild(totalP);

      const thanks = document.createElement("p");
      thanks.className = "tx-receipt-thanks";
      thanks.textContent = "Thank you for your transaction.";
      wrapper.appendChild(thanks);

      fragment.appendChild(wrapper);
    });

    listContainer.innerHTML = "";
    listContainer.appendChild(fragment);
    console.log("[TxStatus] Rendered", transactions.length, "receipt(s) into #txStatusList");
  } catch (err) {
    console.error("[TxStatus] Unexpected error loading transaction status:", err);
    if (messageEl) {
      messageEl.textContent = "Unexpected error loading transaction status.";
      messageEl.style.display = "block";
    }
  }
}

function getCurrentSchoolYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  if (month < 8) {
    return `${year - 1}-${year}`;
  }
  return `${year}-${year + 1}`;
}

function getCurrentTerm() {
  const now = new Date();
  const month = now.getMonth() + 1;

  if (month >= 8 && month <= 12) {
    return "1st Term";
  }

  if (month >= 1 && month <= 3) {
    return "2nd Term";
  }

  if (month >= 4 && month <= 7) {
    return "3rd Term";
  }

  return "1st Term";
}

async function checkIfLoggedIn() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    const userJson = localStorage.getItem("currentUser");
    if (userJson) {
      window.location.href = "dashboard.html";
    }
  }
}

async function logAuditAction(userId, action) {
  try {
    const { error } = await supabase
      .from("audit_log")
      .insert({
        user_id: userId,
        action_taken: action,
        log_timestamp: new Date().toISOString(),
      });

    if (error) {
      console.error("Error logging audit action:", error);
    }
  } catch (err) {
    console.error("Unexpected error logging audit:", err);
  }
}

async function logAuthEvent(action) {
  const userJson = localStorage.getItem("currentUser");
  if (userJson) {
    const user = JSON.parse(userJson);
    if (user?.user_id) {
      await logAuditAction(user.user_id, action);
      return;
    }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const sessionUserId = session?.user?.id;
  if (sessionUserId) {
    await logAuditAction(sessionUserId, action);
  }
}
