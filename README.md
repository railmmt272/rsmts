# Railway Shop Material Tracking System (RSMTS) - Jamalpur Workshop

## 1. Executive Summary & Overview

Welcome to the comprehensive documentation for the **Railway Shop Material Tracking System (RSMTS)**, a specialized, full-stack digital solution engineered specifically for the Indian Railways Workshop at Jamalpur. 

Historically, tracking massive railway assets—such as locomotives, wagons, and heavy cranes—across various maintenance lines, paint sheds, and manufacturing units was a cumbersome, paper-based process. This manual tracking often led to data silos, miscommunications between shifts, and delays in recognizing where a specific asset was located at any given time. The RSMTS platform revolutionizes this process by digitizing the entire lifecycle of an asset within the workshop.

By utilizing a robust architecture consisting of a cloud-based backend, a highly interactive web dashboard for management, and a streamlined mobile application for floor workers, RSMTS ensures absolute real-time synchronization. Every time an asset is shunted (moved) from one line to another, the change is instantly reflected across all platforms. Management can view analytics, identify bottlenecks in specific shops, and ensure that periodic overhauls (POH) and manufacturing deadlines are strictly met.

This documentation serves as a complete, exhaustive guide to understanding the system's architecture, its strict Role-Based Access Control (RBAC) mechanisms, end-to-end workflows, deployment strategies, and the precise functionality of both the web and mobile interfaces.

---

## 2. Architecture & Technology Stack

The RSMTS platform is divided into three heavily decoupled but seamlessly integrated modules. This separation of concerns ensures that the platform is scalable, maintainable, and highly resilient.

### A. Backend API (NestJS + TypeScript)
*   **Purpose:** The backend serves as the single source of truth for the entire platform. It handles all business logic, data validation, user authentication, and database interactions. By utilizing NestJS, the backend benefits from a strictly typed, modular architecture that enforces enterprise-level design patterns.
*   **Hosting Platform:** **Render** (`https://railsets.onrender.com`). Render provides a highly reliable, auto-scaling Node.js environment.
*   **Database:** **MongoDB (Hosted on MongoDB Atlas)**. The choice of a NoSQL database is critical here. Railway assets can have dynamic properties, hierarchical categories, and infinite arrays of movement histories. MongoDB handles this document-based structure effortlessly, allowing for rapid querying of an asset's entire life cycle.
*   **Keep-Alive Mechanism:** Because the platform currently utilizes Render's free tier (which spins down after 15 minutes of inactivity), a cron-based keep-alive mechanism via **UptimeRobot** is employed. This service pings the backend every 10 minutes, ensuring the API is instantly responsive the moment a floor worker opens the mobile app or a manager logs into the dashboard.

### B. Web Dashboard (Next.js + React + Tailwind CSS)
*   **Purpose:** The web dashboard is the administrative and management portal. It is designed for desktop environments where system administrators and high-level management need a broad, analytical view of the workshop. It features data-rich tables, statistical charts, and deep configuration settings.
*   **Hosting Platform:** **Netlify**. Netlify handles the deployment of our React/Next.js frontend. It offers lightning-fast CDN delivery for static and dynamic web assets, continuous deployment directly from the GitHub repository, and automatic SSL provisioning.

### C. Mobile Application (React Native)
*   **Purpose:** The mobile application is a lightweight, strictly focused tool for workshop floor operations. Field workers and shunting masters use this app on their Android devices to update asset locations in real-time, execute shunting programs, and view immediate task lists without needing to return to a desktop terminal.
*   **Distribution Strategy:** Given the internal, enterprise nature of this application, dealing with the delays and public exposure of the Google Play Store is unnecessary. Instead, the React Native APK (`RSMTS_Jamalpur.apk`) is built manually as an Android Release APK and placed directly inside the Frontend's `/public` folder. Users simply visit the Netlify Web Dashboard login page on their mobile browser and click **"Download App"** to sideload it directly onto their Android devices.

---

## 3. Core Business Logic & End-to-End Workflows

The Jamalpur Workshop handles massive, multi-ton assets. The system logic is designed to reflect the physical reality of the workshop floor.

### A. The "Shop" Ecosystem (Fixed Enums)
A major architectural update was the transition to a strictly enforced, fixed `Shop` enum system. Previously, assets were loosely categorized. Now, every single asset in the system is strictly bound to one of four core Shops. This prevents data pollution and ensures that WAGON assets don't accidentally end up in LOCO workflows.

The four fixed Shops are:
1.  **`WAGON`**: The Wagon Periodic Overhaul (POH) and maintenance division.
2.  **`LOCO`**: The Locomotive repair and overhaul division.
3.  **`CRANE`**: Heavy machinery, specifically railway cranes (e.g., 140T Gottwald Cranes) maintenance.
4.  **`MANUFACTURING`**: The division responsible for fabricating new assets and parts from scratch.

### B. Asset Lifecycle (End-to-End)
1.  **Registration / Induction:** 
    When an asset arrives at the workshop, it must be inducted. A user with the correct privileges registers the asset, defining its unique ID (e.g., a specific Wagon Number), its assigned `Shop`, and its initial physical location (e.g., *Receiving Yard*).
2.  **Physical Movement & Digital Tracking:** 
    As the asset is physically moved through the workshop for various stages of repair (e.g., from *Bahar Line* -> *Stripping Shop* -> *Paint Shed*), floor workers use the mobile app to log a "Movement". The backend records a strict, unalterable timestamped history log of every physical move, detailing *who* moved it, *when*, and *where*.
3.  **Status Updates:** 
    Assets do not just change location; they change status. The system tracks whether an asset is `PENDING_INSPECTION`, `IN_PROGRESS`, `WAITING_FOR_PARTS`, or `DISPATCHED`.
4.  **Shunting Programs:** 
    A "Shunting Program" is a daily operational schedule. Rather than moving assets randomly, supervisors create a Shunting Program that says: "Today, we need to move these 5 specific Wagons from the Holding Yard to the Paint Shop." Floor workers view this program on their mobile apps, execute the physical moves, and mark the program items as `DONE`. The system updates the asset's location automatically upon completion.

---

## 4. Comprehensive Role-Based Access Control (RBAC)

Security, accountability, and data integrity are the cornerstones of RSMTS. Because different divisions in the Jamalpur Workshop operate semi-independently, the system must enforce strict boundaries. WAGON workers should not be altering LOCO data, and standard viewers should not be deleting records.

The NestJS backend utilizes a custom `RolesGuard` to inspect the JWT (JSON Web Token) of every single incoming request. If a user attempts to fetch or modify data outside their jurisdiction, the server immediately rejects the request with a `403 Forbidden` or `401 Unauthorized` response. Furthermore, the UI (both Web and Mobile) dynamically hides buttons and pages that the user is not allowed to access, preventing confusion.

Here is the exact, exhaustive breakdown of the Role ecosystem:

### 1. `TPT_RAIL_ADMIN` (Transport Rail Administrator)
*   **Who they are:** The absolute top-level administrators overseeing the entire rail transport and shunting network across all shops.
*   **What they can do:** Absolute God-mode. They can read, create, update, and delete *any* asset across *any* shop (`WAGON`, `LOCO`, `CRANE`, `MANUFACTURING`). They can manage all Shunting Programs, create new user accounts, modify other users' roles, and access all system analytics. They are the ultimate safety net for the system.
*   **Profile Management:** Like all users, they can update their own personal profile details (Name, Email, Password, Remark).

### 2. `WAGON_ADMIN`
*   **Who they are:** The chief supervisors and directors specifically in charge of the Wagon division. 
*   **What they can do:** In the current implementation, `WAGON_ADMIN` shares highly elevated privileges akin to `TPT_RAIL_ADMIN` for broad dashboard visibility, but their primary focus is the absolute management of the Wagon fleet. They have full CRUD (Create, Read, Update, Delete) access to assets and shunting programs. 
*   **Data Visibility:** They are unhindered by shop-specific data blockades, allowing them to oversee the massive volume of Wagon POH data alongside general workshop throughput.

### 3. `MANUFACTURING_ADMIN`
*   **Who they are:** The head of the Manufacturing division.
*   **What they can do:** Highly restricted access tailored to their specific division. A `MANUFACTURING_ADMIN` is strictly limited to interacting with assets and programs that belong to the `MANUFACTURING` shop. 
*   **Security Restrictions:** If a Manufacturing Admin attempts to edit, delete, or even view a Shunting Program meant for the `LOCO` shop, the backend will block it. The UI restricts their dropdowns to only show `MANUFACTURING` options. 
*   **Self-Management:** A crucial recent update allows restricted roles like `MANUFACTURING_ADMIN` to edit their *own* profile (Name, Email, Password) via the `PATCH /users/:id` endpoint by verifying `req.user.userId === id`. However, they are mathematically barred from escalating their own role to `WAGON_ADMIN` or `TPT_RAIL_ADMIN`. The backend explicitly strips the `role` field from their update payload.

### 4. General / Restricted Roles (Future Scalability)
*   The architecture is built to easily support `LOCO_ADMIN` and `CRANE_ADMIN` following the exact same sandbox principles applied to `MANUFACTURING_ADMIN`. 
*   A `VIEWER` role concept exists in the architecture for read-only access (auditors, external stakeholders), ensuring they can monitor the Command Center without accidentally triggering a state change.

### The "Self-Update" Paradigm
A critical security feature implemented across all platforms is the separation of Profile Management from System Configuration. 
*   **Web Dashboard Profile:** Users click their avatar to open a modal where they can change their Name, Email, Password, and Remarks. 
*   **Mobile App Profile:** A dedicated bottom tab provides a beautiful, clean UI to edit personal details. The "Save Changes" button intelligently hides itself until the user actually alters a field, preventing unnecessary API calls.
*   **Role Freezing:** No user, regardless of their current status, can change their own role through standard profile updates. Role changes are strictly reserved for higher-level user management portals (usually handled directly in the database or via a future Super-Admin panel).

---

## 5. Security & Authentication Protocols

The RSMTS platform does not take security lightly. It implements modern web security standards to protect workshop data.

### A. JWT (JSON Web Tokens)
Authentication is completely stateless. When a user logs in via the `/auth/login` endpoint (supplying their email and password), the backend verifies the credentials using **Bcrypt** (which securely hashes and salts passwords). Upon success, the backend generates a JWT containing the user's `userId`, `email`, and `role`. 
*   This token is signed with a strictly confidential `JWT_SECRET`.
*   The token is valid for 24 hours (`JWT_EXPIRATION=24h`).
*   Every subsequent request from the Web Dashboard or Mobile App must include this token in the `Authorization: Bearer <token>` header.

### B. Route Protection
In the Next.js Web Dashboard, an authentication wrapper ensures that unauthenticated users are immediately forcefully redirected to the `/login` screen. 
In the React Native Mobile App, the `AuthContext` determines the navigation state. If no valid token is found in the device's secure async storage, the `MainTabs` navigator is entirely unmounted and replaced with the `LoginScreen`.

### C. API Data Sanitization
The NestJS backend heavily utilizes Data Transfer Objects (DTOs) combined with `class-validator`. If a client sends a payload to create a Shunting Program, but tries to inject a fake `Shop` like `"SPACESHIP"`, the backend's validation pipeline intercepts the request before it even reaches the controller logic, immediately returning a `400 Bad Request` specifying that the Shop must be one of the four valid enums.

---

## 6. Detailed Feature Breakdown: Web Dashboard

The Next.js Web Dashboard is a masterclass in operational UI design, utilizing Tailwind CSS for a highly responsive, modern aesthetic.

### A. Authentication & Onboarding
*   **Login Screen:** Features a pristine, centered login card with integrated error handling (e.g., invalid credentials, network errors). Crucially, this page also serves as the distribution hub for the mobile app, featuring a prominent "Download Mobile App (APK)" button.
*   **Session Persistence:** Utilizes browser `localStorage` or secure cookies to remember the user across tab reloads.

### B. Command Center
The Command Center is the beating heart of the Web Dashboard. It provides a real-time, bird's-eye view of all assets currently in the workshop.
*   **Interactive Tables:** Displays assets with their ID, current Shop, physical location, and status. 
*   **Filtering & Sorting:** Managers can quickly filter to see only assets in the `PAINT_SHED` or only assets belonging to the `LOCO` shop.
*   **Role-Based Rendering:** If a `MANUFACTURING_ADMIN` logs in, the Command Center automatically filters the global view to strictly show `MANUFACTURING` assets, hiding the broader railway chaos to keep them focused.

### C. Shunting Programs Manager
Shunting (moving assets) is complex and requires meticulous planning.
*   **Creation UI:** An intuitive modal allows admins to create a new program. They select a date, assign a Shift (e.g., Morning, Evening, Night), and pick the target `Shop`. 
*   **Asset Assignment:** Within the program, they can assign specific assets, detailing the *From* location and *To* location. 
*   **Real-time Status:** As floor workers complete these moves on their mobile app, the Web Dashboard's Shunting Program page updates to reflect items as `DONE` or `PENDING`.
*   **Security Restrictions:** Again, a `MANUFACTURING_ADMIN` attempting to create a Shunting Program is locked into creating it only for the `MANUFACTURING` shop. The dropdown is disabled/fixed to their assigned role.

### D. User Management & Settings
*   **User Directory:** High-level admins can view all active personnel in the system, seeing their roles and email addresses.
*   **Soft Deletion:** Admins can deactivate users. We utilize soft deletion (setting an `isActive` flag to false) rather than hard deletion, ensuring that historical movement logs tied to that user's ID do not break referential integrity in the database.

---

## 7. Detailed Feature Breakdown: Mobile Application

The React Native application is built for speed, durability, and ease of use in harsh workshop environments. It uses a bottom-tab navigation paradigm for rapid one-handed use.

### A. The "Command Center" Tab (Dashboard)
*   **Quick Metrics:** Displays total assets, pending movements, and alerts.
*   **Recent Activity:** A feed showing the latest movements across the workshop, giving floor workers context on what just happened in their vicinity.

### B. The "Register Asset" Tab
*   **Streamlined Form:** When a new asset is brought into the shed, a worker can whip out their phone, go to this tab, and instantly log it into the system. 
*   **Dropdown Validations:** Ensures they pick a valid Shop and a valid predefined Location. 
*   **Instant Feedback:** Uses `react-native-toast-message` to provide highly visible green success popups or red error popups, crucial for noisy/distracting environments.

### C. The "Shunting Programs" Tab
This is where the actual labor is organized.
*   **Program List:** Displays all active shunting programs for the day.
*   **Task Execution:** A worker taps a program to see the list of assets that need moving. Next to each asset is an action button.
*   **Mark as Done:** When the worker physically moves the wagon, they tap "Mark Done". 
*   **Polished Confirmations:** To prevent accidental taps, tapping an action brings up a beautiful, web-dashboard-style Confirmation Modal (dimmed background, centralized white card, distinct colored action buttons). 
*   **Role-Based Actions:** A `MANUFACTURING_ADMIN` looking at their list can freely mark items as Done or Pending. Previously, this was restricted only to Wagon Admins, but recent updates democratized operation capabilities to the specific Shop admins for their respective shops.

### D. The "Profile" Tab
*   **Refined Aesthetics:** The latest update completely revamped this screen. It features a pristine white background, a centrally aligned Avatar icon with a visual-only edit badge, and beautifully padded input fields for Name, Email, Password, and Remarks.
*   **Role Display:** The user's Role is explicitly displayed in a grayed-out, disabled input field to visually communicate that they cannot elevate their own privileges.
*   **Smart Save Button:** To conserve battery and API calls, the massive blue "Save Changes" button is entirely hidden by default. It mathematically compares the current inputs against the saved User context. The moment the user types a new character in their name, or adds a password, the Save button elegantly appears.
*   **Logout Alignment:** The logout button is stripped of unnecessary icons and perfectly, geometrically centered at the bottom of the scroll view for easy access.

---

## 8. Deployment & Environment Variables

Deploying the RSMTS platform requires setting up all three environments correctly. The environments rely on specific `.env` files.

### A. Backend (`backend/.env`)
The NestJS backend must be configured with access to the database and security secrets.
```env
# The local port for development
PORT=3001

# The MongoDB connection string. MUST be a MongoDB Atlas URI for production.
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/rsmts

# A long, cryptographically secure random string used to sign JWTs.
JWT_SECRET=super_secret_railway_key_998877

# How long a login session lasts before requiring re-authentication.
JWT_EXPIRATION=24h
```
**To run locally:** `cd backend`, `npm install`, `npm run start:dev`.

### B. Frontend (`frontend/.env.local`)
The Next.js frontend only needs to know where the backend API lives.
```env
# Point this to localhost:3001 for local development, or the Render URL for production
NEXT_PUBLIC_API_URL=https://railsets.onrender.com
```
**To run locally:** `cd frontend`, `npm install`, `npm run dev`.

### C. Mobile Application (`application/.env`)
The React Native app compiles the API URL directly into the Android binary.
```env
# Must point to the production Render URL so the Android device can reach the cloud
EXPO_PUBLIC_API_URL=https://railsets.onrender.com
```
**To build the APK locally:** 
1. `cd application`
2. `npm install`
3. `cd android`
4. `.\gradlew assembleRelease` (Windows) or `./gradlew assembleRelease` (Mac/Linux).
5. Locate the APK in `application/android/app/build/outputs/apk/release/app-arm64-v8a-release.apk`.
6. Copy this file into `frontend/public/RSMTS_Jamalpur.apk` so it can be downloaded via the web.

---

## 9. Database Schema & Data Models

Understanding the MongoDB schema is crucial for future development. The backend utilizes Mongoose to define strict schemas.

### A. The User Schema
*   `name`: String, required.
*   `email`: String, required, unique.
*   `password`: String, required (hashed).
*   `role`: Enum (`TPT_RAIL_ADMIN`, `WAGON_ADMIN`, `MANUFACTURING_ADMIN`), required.
*   `remark`: String, optional.
*   `isActive`: Boolean, default true (for soft deletion).

### B. The Asset Schema
*   `assetId`: String, required, unique (The physical ID painted on the side of the wagon/loco).
*   `shop`: Enum (`WAGON`, `LOCO`, `CRANE`, `MANUFACTURING`), required. This is the ultimate partitioning key.
*   `currentLocation`: String, required.
*   `status`: String, required.
*   `movementHistory`: Array of Objects. Every time an asset moves, a new object containing the `from`, `to`, `timestamp`, and `userId` is pushed to this array, creating an immutable audit trail.

### C. The Shunting Program Schema
*   `date`: Date, required.
*   `shift`: String, required (Morning, Evening, Night).
*   `shop`: Enum (`WAGON`, `LOCO`, `CRANE`, `MANUFACTURING`), required.
*   `items`: Array of Objects. Contains `assetId`, `fromLocation`, `toLocation`, and `status` (`PENDING`, `DONE`).
*   `createdBy`: ObjectId (Reference to User).

---

## 10. Future Scalability & Recommendations

The RSMTS platform is built to scale. As the Jamalpur Workshop expands its digital footprint, here are the recommended next steps for the architecture:

1.  **RFID / NFC Integration:** 
    Currently, users manually select assets from a list. In the future, the React Native app can easily be upgraded with NFC scanning capabilities. A worker simply taps their phone against an NFC tag bolted to a Wagon, and the app instantly logs a movement, reducing human error to zero.
2.  **Granular Role Expansion:** 
    The RBAC system is primed to accept `LOCO_ADMIN` and `CRANE_ADMIN` roles. The logic simply requires adding them to the Enum and the `RolesGuard`. The frontend components are already dynamically structured to filter based on whatever Shop the user is assigned to.
3.  **Push Notifications (Firebase):** 
    Integrating Firebase Cloud Messaging (FCM) would allow the backend to instantly ping a floor worker's mobile device when a new Shunting Program is assigned to their shift, eliminating the need for them to manually pull to refresh the app.
4.  **Offline-First Architecture (WatermelonDB/Realm):** 
    Workshop floors often have dead zones for cellular data and Wi-Fi. Upgrading the React Native app to an offline-first architecture would allow workers to log movements without an internet connection. The app would cache these movements locally and quietly sync them to the backend the moment the device regains a connection.
5.  **Analytics Data Warehousing:** 
    As years of movement history accumulate, querying the massive arrays in MongoDB might slow down the primary operational dashboard. Periodically offloading historical data to a dedicated data warehouse (like Google BigQuery) for complex analytical processing would keep the main transactional database lighting fast.

---

## 11. Frequently Asked Questions (FAQ)

**Q: I updated an asset on the mobile app, but the web dashboard hasn't updated. Why?**
A: The web dashboard requires a hard refresh or a re-fetch trigger to pull the latest data from the database. We recommend implementing WebSockets (Socket.io) in a future update to push changes instantly to the web UI without needing a refresh.

**Q: A user forgot their password. How do we reset it?**
A: A `TPT_RAIL_ADMIN` or `WAGON_ADMIN` can log into the web dashboard, navigate to the User Management section, and manually update the user's password. Alternatively, the user can reset it themselves if an email-based "Forgot Password" flow is implemented.

**Q: Can a Manufacturing Admin view Wagon data?**
A: Absolutely not. The backend intercepts the token, recognizes the `MANUFACTURING_ADMIN` role, and forcibly applies a filter to database queries so that only assets where `shop === 'MANUFACTURING'` are returned.

**Q: How do I install the mobile app?**
A: Navigate to the web dashboard URL on your Android phone's web browser. On the login screen, tap "Download App". This will download the `RSMTS_Jamalpur.apk` file. Tap the downloaded file to install it. You may need to grant your browser permission to "Install Unknown Apps" in your Android settings.

**Q: Why did my API request return a 403 Forbidden?**
A: This means your JWT token is valid (you are logged in), but your specific Role does not have the authorization to perform the requested action. For example, a `MANUFACTURING_ADMIN` trying to delete a user will receive a 403.

---

## 12. Conclusion

The Railway Shop Material Tracking System represents a massive leap forward in logistical management for heavy industry. By strictly enforcing data boundaries with Shop enums, securing endpoints with robust JWT-based RBAC, and providing clean, focused user interfaces across both Web and Mobile, RSMTS ensures that the right people have the exact right tools to do their jobs efficiently. 

This living documentation should be updated continually as new features, shops, and roles are integrated into the platform. Happy coding, and safe shunting!
