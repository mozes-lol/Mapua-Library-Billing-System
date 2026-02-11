import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { EMAILJS_CONFIG, SUPABASE_CONFIG } from "../config.js";

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
  Object.values(viewMap).forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      if (id === targetId) {
        el.style.display =
          id === "transaction-details-view" || id === "transaction-status-view"
            ? "block"
            : "flex";
      } else {
        el.style.display = "none";
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

  setTextIfExists("userId", user.user_id || "N/A");
  setTextIfExists(
    "userName",
    `${user.given_name} ${user.middle_name || ""} ${user.last_name}`.trim()
  );
  setTextIfExists("userEmail", user.email_address || "N/A");
  setTextIfExists("userRole", user.role || "N/A");
  setTextIfExists("userProgram", user.program || "N/A");
  setTextIfExists("userYear", user.year || "N/A");
  setTextIfExists("userDepartment", user.department || "N/A");

  console.log(user.email_address, user.role);

  const role = (user.role || "").toLowerCase();
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
  } else if (isAdmin) {
    if (adminContent) {
      adminContent.innerHTML = "";
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

    loadServices();

    if (serviceForm) {
      serviceForm.addEventListener("submit", (e) => {
      e.preventDefault();
  
      const proceed = window.confirm("Proceed to transaction details?");
      if (!proceed) {
        return;
      }
  
      const checkboxes = document.querySelectorAll(
        'input[name="service"]:checked'
      );
  
      if (checkboxes.length === 0) {
        status.textContent = "Please select at least one service";
        status.style.color = "red";
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
        status.textContent =
          "Please enter quantity for at least one service";
        status.style.color = "red";
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
    }

  
    const viewStatusBtn = document.querySelector(
      '#servicesSection button[type="button"]'
    );
    if (viewStatusBtn) {
      viewStatusBtn.addEventListener("click", () => {
        if (hasInlineDashboardViews()) {
          switchDashboardView("transaction-status");
          initTransactionStatusPage();
        } else {
          window.location.href = "transactionStatus.html";
        }
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


  const resetBtn = document.querySelector('button[type="reset"]');
  if (resetBtn) {
    resetBtn.addEventListener("click", (e) => {
      e.preventDefault();
      resetServices();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
    // Log the logout action before signing out
    try {
      await logAuthEvent("User logged out");
    } catch (err) {
      console.error("Error logging logout:", err);
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      status.textContent = "Logout error: " + error.message;
      status.style.color = "red";
    } else {
      localStorage.removeItem("currentUser");
      status.textContent = "Logged out successfully!";
      status.style.color = "green";

      setTimeout(() => {
        window.location.href = "index.html";
      }, 1000);
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
      exportApprovedTransactionsCsv();
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
      return;
    }

    if (!transactions || transactions.length === 0) {
      listContainer.innerHTML =
        '<p style="color: #666;">No approved transactions found.</p>';
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
          <tr class="queue-row" data-transaction-id="${tx.transaction_id}">
            <td>${tx.transaction_id}</td>
            <td>${tx.transaction_code || "N/A"}</td>
            <td>${tx.user_id || "N/A"}</td>
            <td>${name}</td>
            <td>${dateTime}</td>
            <td>${tx.processed_by || "N/A"}</td>
            <td>₱${Number(total).toFixed(2)}</td>
          </tr>
        `;
      })
      .join("");

    listContainer.innerHTML = `
      <table style="width: 100%; border-collapse: collapse;">
        <thead style="background: var(--primary-maroon); color: var(--accent-gold);">
          <tr>
            <th style="text-align: left; padding: 10px;">Transaction ID</th>
            <th style="text-align: left; padding: 10px;">Code</th>
            <th style="text-align: left; padding: 10px;">User ID</th>
            <th style="text-align: left; padding: 10px;">Name</th>
            <th style="text-align: left; padding: 10px;">Date</th>
            <th style="text-align: left; padding: 10px;">Processed By</th>
            <th style="text-align: left; padding: 10px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  } catch (err) {
    console.error("Unexpected error loading approved transactions:", err);
    listContainer.innerHTML =
      '<p style="color: #b22222;">Unexpected error loading approved transactions.</p>';
  }
}

async function exportApprovedTransactionsCsv() {
  const { transactions, txError } = await fetchApprovedTransactions();
  if (txError) {
    console.error("Error exporting approved transactions:", txError);
    window.alert("Failed to export CSV.");
    return;
  }

  if (!transactions || transactions.length === 0) {
    window.alert("No approved transactions found for this range.");
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

    if (!usersError) {
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

    if (!detailError) {
      (details || []).forEach((detail) => {
        totalsById[detail.transaction_id] = detail.total_amount || 0;
      });
    }
  }

  let csv = "Transaction ID,Transaction Code,User ID,Name,Date,Processed By,Total\n";

  transactions.forEach((tx) => {
    const user = usersById[tx.user_id];
    const name = user
      ? `${user.given_name} ${user.last_name}`.trim()
      : "N/A";
    const dateTime = tx.date_time
      ? new Date(tx.date_time).toLocaleString()
      : "N/A";
    const total = totalsById[tx.transaction_id] || 0;

    csv += `${tx.transaction_id},${tx.transaction_code || ""},${
      tx.user_id || ""
    },"${name}","${dateTime}",${tx.processed_by || ""},${Number(
      total
    ).toFixed(2)}\n`;
  });

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;

  const range = getApprovedDateRange();
  const nameSuffix = `${
    range.fromIso ? range.fromIso.slice(0, 10) : "all"
  }_${range.toIso ? range.toIso.slice(0, 10) : "all"}`;
  link.download = `approved_transactions_${nameSuffix}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

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
            <td><span class="badge ${statusClass}">pending</span></td>
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
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h3 style="margin: 0;">Users Table</h3>
        <button id="addUserBtn" style="background-color: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">+ Add New User</button>
      </div>
      <div style="overflow-x: auto;">
        <table id="usersTable" border="1" cellpadding="10" cellspacing="0" style="width: 100%; border-collapse: collapse;">
          <thead style="background-color: #4CAF50; color: white;">
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
            <tr><td colspan="10" style="text-align: center;">Loading...</td></tr>
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
  const adminContent = document.getElementById("adminOnlyContent");
  const transactionsSection = `
    <!-- Queue Table (Pending) -->
    <div id="queueTableSection" style="margin: 20px 0;">
      <h3>Queue - Pending Transactions</h3>
      <div style="overflow-x: auto;">
        <table id="queueTable" border="1" cellpadding="10" cellspacing="0" style="width: 100%; border-collapse: collapse;">
          <thead style="background-color: #ff9800; color: white;">
            <tr>
              <th>Transaction ID</th>
              <th>Transaction Code</th>
              <th>User ID</th>
              <th>User Name</th>
              <th>Date & Time</th>
              <th>School Year</th>
              <th>Term</th>
              <th>Status</th>
              <th>Total Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="queueTableBody">
            <tr><td colspan="10" style="text-align: center;">Loading...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Approved Table -->
    <div id="approvedTableSection" style="margin: 20px 0;">
      <h3>Approved Transactions</h3>
      <div style="overflow-x: auto;">
        <table id="approvedTable" border="1" cellpadding="10" cellspacing="0" style="width: 100%; border-collapse: collapse;">
          <thead style="background-color: #4CAF50; color: white;">
            <tr>
              <th>Transaction ID</th>
              <th>Transaction Code</th>
              <th>User ID</th>
              <th>User Name</th>
              <th>Date & Time</th>
              <th>School Year</th>
              <th>Term</th>
              <th>Status</th>
              <th>Processed By</th>
              <th>Total Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="approvedTableBody">
            <tr><td colspan="11" style="text-align: center;">Loading...</td></tr>
          </tbody>
        </table>
      </div>
      <p id="transactionCrudStatus" style="margin-top: 10px; font-weight: bold;"></p>
    </div>
    
    <!-- Transaction Details Modal -->
    <div id="transactionDetailsModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 1000;">
      <div style="background-color: white; margin: 50px auto; padding: 30px; width: 700px; border-radius: 10px; max-height: 80vh; overflow-y: auto;">
        <h2>Transaction Details</h2>
        <div id="transactionDetailsContent" style="margin: 20px 0;">
          <p><strong>Transaction ID:</strong> <span id="detailTransactionId"></span></p>
          <p><strong>Transaction Code:</strong> <span id="detailTransactionCode"></span></p>
          <div style="margin: 10px 0;">
            <label for="confirmTransactionCode" style="display: block; font-weight: bold; margin-bottom: 5px;">Enter Transaction Code to Finalize:</label>
            <input id="confirmTransactionCode" type="text" autocomplete="off" style="width: 100%; padding: 8px;" />
            <p id="transactionCodeStatus" style="margin: 6px 0 0; font-weight: bold;"></p>
          </div>
          <p><strong>User:</strong> <span id="detailUserName"></span></p>
          <p><strong>Date & Time:</strong> <span id="detailDateTime"></span></p>
          <p><strong>School Year:</strong> <span id="detailSchoolYear"></span></p>
          <p><strong>Term:</strong> <span id="detailTerm"></span></p>
          <p><strong>Status:</strong> <span id="detailStatus"></span></p>
          <p><strong>Processed By:</strong> <span id="detailProcessedBy"></span></p>
          <hr style="margin: 20px 0;">
          <h3>Services</h3>
          <table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead style="background-color: #f0f0f0;">
              <tr>
                <th>Service Name</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody id="detailServicesTable">
            </tbody>
          </table>
          <p style="margin-top: 15px; font-size: 18px; font-weight: bold; text-align: right;">Grand Total: ₱<span id="detailGrandTotal"></span></p>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 10px; justify-content: flex-end;">
          <button id="finalizeInvoiceBtn" style="background-color: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Finalize & Send Invoice</button>
          <button id="closeDetailsBtn" style="background-color: #f44336; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Close</button>
        </div>
      </div>
    </div>
  `;
  
  adminContent.insertAdjacentHTML('beforeend', transactionsSection);
  
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
  const queueTableBody = document.getElementById("queueTableBody");
  const approvedTableBody = document.getElementById("approvedTableBody");

  if (!queueTableBody || !approvedTableBody) {
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
      const errorMsg = '<tr><td colspan="10" style="text-align: center; color: red;">Error loading transactions</td></tr>';
      if (queueTableBody) queueTableBody.innerHTML = errorMsg;
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

    // Render both tables
    if (queueTableBody) {
      queueTableBody.innerHTML = renderTableRows(pendingTransactions, false);
    }
    if (approvedTableBody) {
      approvedTableBody.innerHTML = renderTableRows(approvedTransactions, true);
    }

  } catch (error) {
    console.error("Error loading transactions:", error);
    const errorMsg = '<tr><td colspan="10" style="text-align: center; color: red;">Error loading transactions</td></tr>';
    if (queueTableBody) queueTableBody.innerHTML = errorMsg;
    if (approvedTableBody) approvedTableBody.innerHTML = errorMsg;
  }
}

function ensureTransactionDetailsModal() {
  const existing = document.getElementById("transactionDetailsModal");
  if (existing) {
    const closeBtn = document.getElementById("closeDetailsBtn");
    const finalizeBtn = document.getElementById("finalizeInvoiceBtn");
    if (closeBtn) closeBtn.onclick = closeTransactionDetails;
    if (finalizeBtn) finalizeBtn.onclick = handleFinalizeInvoice;
    return existing;
  }

  const modal = document.createElement("div");
  modal.id = "transactionDetailsModal";
  modal.style.cssText =
    "display:none; position:fixed; top:0; left:0; width:100%; height:100%; background-color:rgba(0,0,0,0.5); z-index:1000;";
  modal.innerHTML = `
    <div style="background-color: white; margin: 50px auto; padding: 30px; width: 700px; border-radius: 10px; max-height: 80vh; overflow-y: auto;">
      <h2>Transaction Details</h2>
      <div id="transactionDetailsContent" style="margin: 20px 0;">
        <p><strong>Transaction ID:</strong> <span id="detailTransactionId"></span></p>
        <p><strong>Transaction Code:</strong> <span id="detailTransactionCode"></span></p>
        <div style="margin: 10px 0;">
          <label for="confirmTransactionCode" style="display: block; font-weight: bold; margin-bottom: 5px;">Enter Transaction Code to Finalize:</label>
          <input id="confirmTransactionCode" type="text" autocomplete="off" style="width: 100%; padding: 8px;" />
          <p id="transactionCodeStatus" style="margin: 6px 0 0; font-weight: bold;"></p>
        </div>
        <p><strong>User:</strong> <span id="detailUserName"></span></p>
        <p><strong>Date & Time:</strong> <span id="detailDateTime"></span></p>
        <p><strong>School Year:</strong> <span id="detailSchoolYear"></span></p>
        <p><strong>Term:</strong> <span id="detailTerm"></span></p>
        <p><strong>Status:</strong> <span id="detailStatus"></span></p>
        <p><strong>Processed By:</strong> <span id="detailProcessedBy"></span></p>
        <hr style="margin: 20px 0;">
        <h3>Services</h3>
        <table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead style="background-color: #f0f0f0;">
            <tr>
              <th>Service Name</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody id="detailServicesTable"></tbody>
        </table>
        <p style="margin-top: 15px; font-size: 18px; font-weight: bold; text-align: right;">Grand Total: ₱<span id="detailGrandTotal"></span></p>
      </div>
      <div style="display: flex; gap: 10px; margin-top: 10px; justify-content: flex-end;">
        <button id="finalizeInvoiceBtn" style="background-color: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Finalize & Send Invoice</button>
        <button id="closeDetailsBtn" style="background-color: #f44336; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeBtn = document.getElementById("closeDetailsBtn");
  const finalizeBtn = document.getElementById("finalizeInvoiceBtn");
  if (closeBtn) closeBtn.onclick = closeTransactionDetails;
  if (finalizeBtn) finalizeBtn.onclick = handleFinalizeInvoice;

  return modal;
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
    document.getElementById("detailStatus").textContent = transaction.status || "N/A";
    document.getElementById("detailProcessedBy").textContent = transaction.processed_by || "Not processed yet";
    document.getElementById("detailGrandTotal").textContent = details.total_amount.toFixed(2);

    const finalizeButton = document.getElementById("finalizeInvoiceBtn");
    const codeInput = document.getElementById("confirmTransactionCode");
    const codeStatus = document.getElementById("transactionCodeStatus");
    const existingCode = String(transaction.transaction_code || "").trim();
    finalizeButton.dataset.transactionId = String(transaction.transaction_id);
    finalizeButton.dataset.currentStatus = transaction.status || "";
    finalizeButton.dataset.userEmail = userEmail;
    finalizeButton.dataset.userName = userName;

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
            codeStatus.textContent = "Enter the transaction code to continue.";
            codeStatus.style.color = "#f44336";
          } else {
            codeStatus.textContent = "Transaction code ready.";
            codeStatus.style.color = "#4CAF50";
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
          <tr>
            <td>${serviceName}</td>
            <td>${service.quantity}</td>
            <td>₱${Number(unitPrice || 0).toFixed(2)}</td>
            <td>₱${Number(service.total || 0).toFixed(2)}</td>
          </tr>
        `;
      })
      .join("");

    // Show modal
    document.getElementById("transactionDetailsModal").style.display = "block";
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
  const statusElement =
    document.getElementById("transactionCrudStatus") ||
    document.getElementById("transactionCodeStatus");
  const finalizeButton = document.getElementById("finalizeInvoiceBtn");
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

    // Send email to user after approval
    try {
      const toEmail = finalizeButton.dataset.userEmail || "";
      const toName = finalizeButton.dataset.userName || "";
      const orderItems = finalizeButton.dataset.orderItems || "";
      const totalAmount = document.getElementById("detailGrandTotal")?.textContent || "";

      await sendApprovalEmail({
        toEmail,
        toName,
        transactionId,
        transactionCode: enteredCode,
        totalAmount,
        orderItems,
      });

      if (statusElement) {
        statusElement.textContent = "Transaction approved and email sent.";
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
      statusElement.textContent = "Please select at least one service";
      statusElement.style.color = "red";
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
      statusElement.textContent =
        "Please enter quantity for at least one service";
      statusElement.style.color = "red";
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
    statusTextEl.textContent = "Pending (not yet submitted)";
  }

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

        const list = document.createElement("ul");

        services.forEach((item) => {
          const svc = mapById[item.service_id];
          const li = document.createElement("li");
          const name = svc ? svc.servicename : `Service ${item.service_id}`;
          const price = svc ? svc.unitprice : "";
          li.textContent = `${name} (Qty: ${item.quantity}, Total: ₱${Number(
            item.total
          ).toFixed(2)}${price !== "" ? `, Unit Price: ₱${price}` : ""})`;
          list.appendChild(li);
        });

        servicesContainer.innerHTML = "";
        servicesContainer.appendChild(list);
      }
    }

    const confirmBtn = document.getElementById("confirmTransactionBtn");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", async () => {
        const ok = window.confirm("Submit this transaction?");

        if (!ok) {
          return;
        }

        const success = await submitPendingTransaction(
          user,
          pending,
          status || document.body
        );
        if (success) {
          localStorage.removeItem("pendingTransaction");
          if (statusTextEl) {
            statusTextEl.textContent = "Submitted to server";
          }

          window.alert("Your transaction is being processed");
          if (hasInlineDashboardViews()) {
            switchDashboardView("transaction-status");
            initTransactionStatusPage();
          } else {
            window.location.href = "transactionStatus.html";
          }
        }
      });
    }
  } catch (err) {
    console.error("Unexpected error loading transaction details:", err);
    if (status) {
      status.textContent = "Unexpected error loading transaction details.";
    }
  }
}

async function submitPendingTransaction(user, pending, statusElement) {
  try {
    const selectedServices = pending.services || [];
    const totalAmount = pending.totalAmount || 0;

    if (!selectedServices.length || totalAmount <= 0) {
      statusElement.textContent = "Invalid pending transaction.";
      statusElement.style.color = "red";
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
    statusElement.textContent = "Transaction submitted successfully!";
    statusElement.style.color = "green";
    return true;
  } catch (error) {
    console.error("Transaction error:", error);
    statusElement.textContent = "Transaction failed: " + error.message;
    statusElement.style.color = "red";
    return false;
  }
}

async function initTransactionStatusPage() {
  const userJson = localStorage.getItem("currentUser");
  if (!userJson) {
    window.location.href = "index.html";
    return;
  }

  const user = JSON.parse(userJson);
  const listContainer = document.getElementById("txStatusList");
  const messageEl = document.getElementById("txStatusMessage");
  const makeAnotherBtn = document.getElementById("makeAnotherTransactionBtn");
  const goBackBtn = document.getElementById("goBackToDashboardBtn");

 
  if (goBackBtn) {
    goBackBtn.addEventListener("click", () => {
      if (hasInlineDashboardViews()) {
        switchDashboardView("queue");
      } else {
        window.location.href = "dashboard.html";
      }
    });
  }

  if (makeAnotherBtn) {
    makeAnotherBtn.addEventListener("click", () => {
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

    if (queueText && messageEl) {
      messageEl.textContent = queueText;
    }

    
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.user_id)
      .order("date_time", { ascending: false });

    if (txError) {
      console.error("Error fetching transactions:", txError);
      if (messageEl) {
        messageEl.textContent = "Error loading transactions.";
      }
      return;
    }

    if (!transactions || transactions.length === 0) {
      if (messageEl) {
        messageEl.textContent = "No transactions found.";
      }
      return;
    }

    const txIds = transactions.map((t) => t.transaction_id);

    
    const { data: details, error: detailError } = await supabase
      .from("transaction_detail")
      .select("*")
      .in("transaction_id", txIds);

    if (detailError) {
      console.error("Error fetching transaction details:", detailError);
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

      const header = document.createElement("p");
      header.textContent = `Transaction ID: ${tx.transaction_id} | User ID: ${tx.user_id} | Processed By: ${
        tx.processed_by || "N/A"
      } | Status: ${tx.status || "N/A"} | Date: ${
        tx.date_time ? new Date(tx.date_time).toLocaleString() : "N/A"
      }`;
      wrapper.appendChild(header);

      const servicesTitle = document.createElement("p");
      servicesTitle.textContent = "Services:";
      wrapper.appendChild(servicesTitle);

      if (services.length > 0) {
        const ul = document.createElement("ul");
        services.forEach((item) => {
          const li = document.createElement("li");
          const svc = serviceTypeById[item.service_id];
          const name = svc ? svc.servicename : `Service ${item.service_id}`;
          const price = svc ? svc.unitprice : "";
          li.textContent = `${name} (Qty: ${item.quantity}, Total: ₱${Number(
            item.total
          ).toFixed(2)}${price !== "" ? `, Unit Price: ₱${price}` : ""})`;
          ul.appendChild(li);
        });
        wrapper.appendChild(ul);
      } else {
        const noServices = document.createElement("p");
        noServices.textContent = "No services recorded.";
        wrapper.appendChild(noServices);
      }

      const totalP = document.createElement("p");
      totalP.textContent = `Total: ₱${Number(totalAmount).toFixed(2)}`;
      wrapper.appendChild(totalP);

      fragment.appendChild(wrapper);
    });

    listContainer.innerHTML = "";
    listContainer.appendChild(fragment);
  } catch (err) {
    console.error("Unexpected error loading transaction status:", err);
    if (messageEl) {
      messageEl.textContent = "Unexpected error loading transaction status.";
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
