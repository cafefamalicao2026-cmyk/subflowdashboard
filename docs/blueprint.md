# **App Name**: SubFlow Dashboard

## Core Features:

- User Authentication: Allow users to sign in and sign out using email and password, powered by Firebase Authentication (v10+).
- Protected Dashboard Routes: Ensure that the user can only access the dashboard and its features after successfully logging in.
- Dynamic Subscription Status Display: Display the user's current subscription status (e.g., 'Cancelado' badge) and upcoming billing details, fetched from a 'users' collection in Firestore.
- Subscription Activation Call-to-Action: Present a clear banner prompting the user to activate their plan, displaying the price (R$ 49,90) and an 'Assinar Plano' button.
- User Profile Information: Show the authenticated user's profile details including avatar, name, and email, with links to 'Editar Perfil' and 'Central de Ajuda'.
- Payment History View: Provide a dedicated section to display the user's payment history, initially showing a 'Nenhum pagamento registrado ainda.' message.

## Style Guidelines:

- Primary color: #2285DB. A confident and digital blue, embodying trust and clarity, used for main action buttons and active elements.
- Background color: #F3F7F9. An airy, near-white background with a hint of cool blue, creating a spacious and clean canvas across the application.
- Accent color: #8080CC. A soft, secondary purple-blue, used for subtle highlights or secondary informational elements.
- Headline and body font: 'Inter' (sans-serif), chosen for its modern, clean, and highly readable characteristics, ideal for a data-rich dashboard.
- Utilize modern, minimalist line icons that align with a professional and digital aesthetic, such as for the logout icon.
- Employ a responsive grid or Flexbox system to create a structured and adaptive dashboard layout, featuring a two-column top section (70% content, 30% settings) and a full-width bottom section for payment history.
- Incorporate subtle, clean transition animations for UI elements on interactions or state changes, ensuring a smooth user experience.