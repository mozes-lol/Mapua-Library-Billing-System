import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_CONFIG } from "../config.js";

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

const currentPage = window.location.pathname.split("/").pop();

if (currentPage === "index.html" || currentPage === "") {
  initLoginPage();
} else if (currentPage === "dashboard.html") {
  initDashboardPage();
}

function initLoginPage() {
  const loginForm = document.getElementById("loginForm");
  const status = document.getElementById("status");

  checkIfLoggedIn();

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "Logging in...";

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      status.textContent = "Authenticating...";

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

      if (authError) {
        console.error("Auth error:", authError);
        throw new Error("Authentication failed: " + authError.message);
      }

      status.textContent = "Fetching user data...";
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

      status.textContent = "Login successful! Redirecting...";
      status.style.color = "green";

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1000);
    } catch (error) {
      console.error("Login error:", error);
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

  // Check if user is admin and show message
  if (user.role && user.role.toLowerCase() === "admin") {
    document.getElementById("adminMessage").style.display = "block";
    // Show database information for admin
    document.getElementById("databaseInfo").style.display = "block";
    document.getElementById("dbUrl").textContent = SUPABASE_CONFIG.url;
    // Dynamically create and show users table for admin only
    createUsersTableHTML();
    loadUsersTable();
  }

  loadServices();

  serviceForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await submitTransaction(user, status);
  });

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

    servicesList.innerHTML = services
      .map(
        (service) => `
            <div>
                <input type="checkbox" id="service_${service.service_id}" name="service" value="${service.service_id}" data-price="${service.unitprice}">
                <label for="service_${service.service_id}">${service.servicename} - ₱${service.unitprice}</label>
                <input type="number" id="quantity_${service.service_id}" min="0" value="0" disabled>
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

function openAddUserForm() {
  document.getElementById("formTitle").textContent = "Add New User";
  document.getElementById("userForm").reset();
  document.getElementById("formUserId").value = "";
  document.getElementById("userFormModal").style.display = "block";
}

function closeUserForm() {
  document.getElementById("userFormModal").style.display = "none";
  document.getElementById("userForm").reset();
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
