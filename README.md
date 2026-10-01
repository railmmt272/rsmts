# RSMTS: Rolling Stock Movement & Tracking System (End-to-End Documentation)

Welcome to the **Rolling Stock Movement & Tracking System (RSMTS)**, an enterprise-grade platform custom-built for the Jamalpur Workshop (JMPW) of Indian Railways. RSMTS is designed to digitize, monitor, and optimize the movement, repairing, and manufacturing lifecycles of railway assets (Wagons, Locos, Cranes, Tower Cars) across complex workshop locations.

---

## 1. End-to-End System Architecture & Hosting Platforms

The RSMTS platform is a decoupled, modern architecture comprised of three distinct workspaces. Every piece of the infrastructure is strategically hosted to ensure high availability and performance.

### A. Backend API (NestJS + TypeScript)
*   **Purpose:** The central nervous system of the platform. It handles all business logic, database transactions, JWT authentication, and strict Role-Based Access Control (RBAC).
*   **Hosting Platform:** **Render** (`https://railsets.onrender.com`). Render hosts the Node.js environment.
*   **Database:** **MongoDB (Hosted on MongoDB Atlas)**. A NoSQL cloud database chosen for its flexibility in handling dynamic asset hierarchies and extensive movement histories.
*   **Keep-Alive Mechanism:** Because Render spins down free-tier instances after 15 minutes of inactivity, we utilize **UptimeRobot**. UptimeRobot sends a scheduled HTTP ping to the backend every 10 minutes to "wake" it up, ensuring the API is instantly responsive when mobile users or web dashboard users log in.

### B. Web Dashboard (Next.js + React + Tailwind CSS)
*   **Purpose:** The administrative and management portal. It features a rich, interactive UI for system admins and management to view analytics, configure master data, and track overall workshop efficiency.
*   **Hosting Platform:** **Netlify**. Netlify handles the deployment of our React/Next.js frontend. It offers lightning-fast CDN delivery for the web assets and seamless continuous deployment whenever code is pushed to the GitHub repository.

### C. Mobile Application (React Native)
*   **Purpose:** A lightweight, on-the-ground tool for workshop floor operations. Field workers use this to update asset locations in real-time without needing a desktop terminal.
*   **Distribution Strategy:** Rather than dealing with Google Play Store delays, the React Native APK (`RSMTS_Jamalpur.apk`) is built manually and placed directly inside the Frontend's `/public` folder. Users can simply visit the Netlify Web Dashboard login page and click **"Download App"** to install it directly to their Android devices.

---

## 2. Environment Variables (.env) Configuration

To run or deploy this platform, the following environment setups are strictly required for each module.

### Backend (`backend/.env`)
The backend requires connection strings for the database and secrets for user session security.
```env
# The port the NestJS server runs on locally
PORT=3001

# MongoDB Atlas Connection String
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/rsmts

# JSON Web Token Secret for signing user sessions
JWT_SECRET=your_super_secret_jwt_string_here

# Token validity duration
JWT_EXPIRATION=24h
```

### Frontend (`frontend/.env.local`)
The frontend only needs to know where the backend API lives.
```env
# Point this to localhost:3001 for local development, or the Render URL for production
NEXT_PUBLIC_API_URL=https://railsets.onrender.com
```

### Mobile Application (`application/.env`)
The Expo/React Native app compiles the API URL into the APK.
```env
# Point this to the Render URL so the Android device knows where to send HTTP requests
EXPO_PUBLIC_API_URL=https://railsets.onrender.com
```

---

## 3. Core Business Logic & End-to-End Workflows

### A. The Two Main Pipelines
Assets entering the Jamalpur Workshop are split into two distinct operational pipelines. The backend enforces strict validation to ensure assets cannot be assigned to the wrong pipeline.
1.  **WAGON POH (Periodic Overhaul):** Strictly reserved for repairing generic Wagons. The backend will *reject* any asset trying to enter this pipeline unless its root category is exactly `WAGON`.
2.  **OTHERS (Manufacturing & Specialty):** Reserved for new manufacturing and specialized repairs. This pipeline explicitly supports four asset root categories: `WAGON_MFG` (Wagon Manufacturing), `LOCO` (Locomotives), `CRANE`, and `TOWER_CAR`.

### B. Asset Lifecycle (End-to-End)
1.  **Registration:** An asset is logged into the system, assigned a unique ID (validated by specific numeric/alphanumeric rules based on its category), and dropped into a Pipeline.
2.  **Movement/Routing:** As the asset physically moves through the workshop (e.g., from *Bahar Line* to *Sick Line* to *Paint Shed*), floor workers use the mobile app to log a "Movement". The backend records a timestamped history log of every physical move.
3.  **Status Updates:** Assets transition through statuses (e.g., `IN_WAGON_POH`, `DISPATCHED`).
4.  **Shunting Programs:** Daily schedules where specific assets are queued to be moved (shunted) from one shop/line to another.

---

## 4. Comprehensive Role-Based Access Control (RBAC)

Security is paramount. The NestJS backend utilizes a custom `RolesGuard` to check the JWT token of every incoming request. If a user tries to fetch or modify data they aren't allowed to, the server immediately returns a `403 Forbidden` error.

Here is the exact breakdown of what each role can and cannot do:

#### 1. `SYSTEM_ADMIN`
*   **Who they are:** The IT Administrators.
*   **What they can do:** Absolute God-mode. They can register users, define Master Asset Categories, define Master Locations, hard-delete records if necessary, and access all analytics and settings.

#### 2. `MANAGEMENT`
*   **Who they are:** High-level Workshop Directors.
*   **What they can do:** Almost identical to System Admins. They can view the entire system, manage users, configure Master Locations/Categories, and view all operational data.
*   **What they cannot do:** (In current scope, Management acts as a mirror to Admin, but conceptually they defer IT/System specific resets to the Admin).

#### 3. `OPS_MANAGEMENT`
*   **Who they are:** Floor Supervisors, Shift Leads, and Shunting Masters.
*   **What they can do:** Complete control over *Operations*. They can Add or Remove assets from any pipeline, Allocate/Reallocate assets to any location, change asset statuses, and Create or Edit Shunting Programs. They can also view the User directory to see who is active.
*   **What they cannot do:** They **cannot** create new users, modify user passwords, delete users, or alter the system's Master Configurations (e.g., they cannot invent a new location like "Shop Z", they can only move assets to locations already approved by Admins).

#### 4. `VIEWER`
*   **Who they are:** Standard workshop employees, auditors, or external stakeholders.
*   **What they can do:** 100% Read-Only access. They can view the Command Center, track asset locations, see Shunting Programs, and view analytics.
*   **What they cannot do:** They cannot edit, delete, or create *anything*. Every `POST`, `PATCH`, and `DELETE` request in the system is blocked for this role.

*(Note on User Deletion: The platform utilizes **Soft Deletion** for users. When an admin "deletes" a user, their `isActive` flag turns to `false`. This ensures that historical movement records tied to that user's ID do not break the database or crash the UI. Inactive users receive a red "Inactive" badge in the UI and their login is disabled).*

---

## 5. User Interface (UI) Walkthrough

### Web Dashboard (Frontend)
*   **Login Page:** A secure, visually appealing landing page featuring Indian Railways branding. Contains the direct download link for the Mobile APK.
*   **Command Center:** The primary operational screen. Broken down into intuitive tabs: 
    *   `WAGON POH` -> Displays only Wagons.
    *   `ALL OTHERS` -> Displays Loco, Crane, Tower Car, and Wagon (MFG).
    *   `LOCATIONS` -> Visualizes asset density per physical workshop location.
*   **Analytics Page:** A visual dashboard using charts to show asset inflow, outflow, and pipeline congestion over custom date ranges.
*   **Settings Panel:** (Admin Only). A grid interface for creating hierarchical categories (e.g., Grandparent `CRANE` -> Parent `140T_CRANE` -> Child `140T_GOTTWALD`) and defining workshop locations.

### Mobile Application
*   **Simplified Interface:** Because it is used on the shop floor, the mobile app features large touch targets and simplified forms.
*   **QR/Barcode Ready:** The layout is structured to quickly pull up an asset profile and log a location transfer in under 3 taps, saving immense time compared to paper-based tracking.
*   **Always Synchronized:** By connecting directly to the Render backend, any update made on the Mobile App instantly reflects on the Web Dashboard for Management to see.
