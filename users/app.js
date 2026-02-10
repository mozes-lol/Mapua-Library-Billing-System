import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_CONFIG } from "../config.js";

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

const currentPage = window.location.pathname.split("/").pop();

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
  const loadingText = loadingOverlay.querySelector(".loading-text");
  const submitBtn = document.querySelector(".submit-btn");

  checkIfLoggedIn();

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Show loading spinner
    loadingText.textContent = "Logging in...";
    loadingOverlay.style.display = "flex";
    submitBtn.disabled = true;
    status.textContent = "";

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      loadingText.textContent = "Authenticating...";

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

      if (authError) {
        console.error("Auth error:", authError);
        throw new Error("Authentication failed: " + authError.message);
      }

      loadingText.textContent = "Fetching user data...";
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

      loadingText.textContent = "Login successful! Redirecting...";

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1000);
    } catch (error) {
      console.error("Login error:", error);

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

  document.getElementById("userId").textContent = user.user_id || "N/A";
  document.getElementById("userName").textContent = `${user.given_name} ${
    user.middle_name || ""
  } ${user.last_name}`.trim();
  document.getElementById("userEmail").textContent =
    user.email_address || "N/A";
  document.getElementById("userRole").textContent = user.role || "N/A";
  document.getElementById("userProgram").textContent = user.program || "N/A";
  document.getElementById("userYear").textContent = user.year || "N/A";
  document.getElementById("userDepartment").textContent =
    user.department || "N/A";

  const role = (user.role || "").toLowerCase();
  const isSuperAdmin = role === "super admin" || role === "superadmin";
  const isAdmin = role === "admin";
  const isStudent = role === "student";
  const isInstructor = role === "instructor";
  const isRegularUser = isStudent || isInstructor;

 
  const servicesSection =
    document.getElementById("servicesSection") ||
    document.querySelector(".service-type");
  const adminContent = document.getElementById("adminOnlyContent");

  if (isSuperAdmin) {
    createUsersTableHTML();
    loadUsersTable();
    createServiceTypesTableHTML();
    loadServiceTypesTable();
    createTransactionsTableHTML();
    loadTransactionsTable();

    if (servicesSection) {
      servicesSection.style.display = "none";
    }
  } else if (isAdmin) {
    createServiceTypesTableHTML();
    loadServiceTypesTable();
    createTransactionsTableHTML();
    loadTransactionsTable();

    if (servicesSection) {
      servicesSection.style.display = "none";
    }
  } else if (isRegularUser) {
    if (adminContent) {
      adminContent.innerHTML = "";
    }

    loadServices();

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
  
      window.location.href = "transactionDetails.html";
    });
  }

  const resetBtn = document.querySelector('button[type="reset"]');
  if (resetBtn) {
    resetBtn.addEventListener("click", (e) => {
      e.preventDefault();
      resetServices();
    });
  }

  logoutBtn.addEventListener("click", async () => {
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

async function loadServices() {
  const servicesList = document.getElementById("servicesList");

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
  const adminContent = document.getElementById("adminOnlyContent");
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

async function loadTransactionsTable() {
  const queueTableBody = document.getElementById("queueTableBody");
  const approvedTableBody = document.getElementById("approvedTableBody");

  try {
    // Fetch all transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from("transactions")
      .select("*")
      .order("transaction_id", { ascending: false });

    if (transactionsError) {
      console.error("Error fetching transactions:", transactionsError);
      const errorMsg = '<tr><td colspan="10" style="text-align: center; color: red;">Error loading transactions</td></tr>';
      queueTableBody.innerHTML = errorMsg;
      approvedTableBody.innerHTML = errorMsg;
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
    queueTableBody.innerHTML = renderTableRows(pendingTransactions, false);
    approvedTableBody.innerHTML = renderTableRows(approvedTransactions, true);

  } catch (error) {
    console.error("Error loading transactions:", error);
    const errorMsg = '<tr><td colspan="10" style="text-align: center; color: red;">Error loading transactions</td></tr>';
    document.getElementById("queueTableBody").innerHTML = errorMsg;
    document.getElementById("approvedTableBody").innerHTML = errorMsg;
  }
}

window.viewTransactionDetails = async function(transactionId) {
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
    if (transaction.user_id) {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("given_name, middle_name, last_name")
        .eq("user_id", transaction.user_id)
        .single();

      if (userError) {
        console.error("Error fetching user:", userError);
      } else if (user) {
        userName = `${user.given_name} ${user.middle_name || ""} ${user.last_name}`
          .replace(/\s+/g, " ")
          .trim();
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

    // Populate services table
    const servicesTableBody = document.getElementById("detailServicesTable");
    servicesTableBody.innerHTML = details.services
      .map(service => {
        const serviceInfo = servicesMap[service.service_id];
        const serviceName = serviceInfo ? serviceInfo.servicename : `Service ID: ${service.service_id}`;
        const unitPrice = serviceInfo ? serviceInfo.unitprice : (service.total / service.quantity);
        
        return `
          <tr>
            <td>${serviceName}</td>
            <td>${service.quantity}</td>
            <td>₱${unitPrice.toFixed(2)}</td>
            <td>₱${service.total.toFixed(2)}</td>
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
  const statusElement = document.getElementById("transactionCrudStatus");
  const finalizeButton = document.getElementById("finalizeInvoiceBtn");
  const transactionId = Number(finalizeButton.dataset.transactionId);
  const currentStatus = finalizeButton.dataset.currentStatus;
  const codeInput = document.getElementById("confirmTransactionCode");
  const enteredCode = String(codeInput?.value || "").trim();

  if (!transactionId) {
    statusElement.textContent = "Missing transaction ID for processing.";
    statusElement.style.color = "red";
    return;
  }

  if (currentStatus !== "Pending") {
    statusElement.textContent = "Only pending transactions can be processed.";
    statusElement.style.color = "red";
    return;
  }

  if (!enteredCode) {
    statusElement.textContent = "Please enter a transaction code to finalize.";
    statusElement.style.color = "red";
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

    statusElement.textContent = "Transaction processed successfully.";
    statusElement.style.color = "green";

    await loadTransactionsTable();
  } catch (error) {
    console.error("Error finalizing invoice:", error);
    statusElement.textContent = "Failed to process transaction: " + error.message;
    statusElement.style.color = "red";
    finalizeButton.disabled = false;
    finalizeButton.textContent = "Finalize & Send Invoice";
    finalizeButton.style.opacity = "1";
    finalizeButton.style.cursor = "pointer";
  }
}

async function loadUsersTable() {
  const tableBody = document.getElementById("usersTableBody");

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
      return;
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
      return;
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
  } catch (error) {
    console.error("Transaction error:", error);
    statusElement.textContent = "Transaction failed: " + error.message;
    statusElement.style.color = "red";
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
          window.location.href = "transactionStatus.html";
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

    if (makeAnotherBtn) {
      makeAnotherBtn.addEventListener("click", () => {
        window.location.href = "dashboard.html";
      });
    }
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
