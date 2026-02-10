import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_CONFIG } from "../config.js";

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

function setTextIfExists(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = value;
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

  const status = document.getElementById("status");
  if (status) {
    status.textContent = "";
  }
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

    servicesList.innerHTML = services
      .map(
        (service) => `
            <div>
                <input class="checkbox" type="checkbox" id="service_${service.service_id}" name="service" value="${service.service_id}" data-price="${service.unitprice}">
                <div class="servicename-holder">
                  <label class="service-name"for="service_${service.service_id}">${service.servicename} - ₱${service.unitprice}</label>
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
        if (!quantityInput.disabled){
          updateTotalAmount();
        }
      });
    });

  } catch (error) {
    console.error("Error loading services:", error);
    servicesList.innerHTML = "<p>Error loading services</p>";
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
