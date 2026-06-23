export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                primary: "#F4B942",      // amarillo principal
                secondary: "#5EC0D9",    // botones
                background: "#F5F5F5",   // gris fondo
                surface: "#FFFFFF",      // cards
                danger: "#E2725B",       // terracota: acciones destructivas
            },

            borderRadius: {
                xl: "1rem",
                '2xl': "1.5rem",
            },

            boxShadow: {
                card: "0 8px 20px rgba(0,0,0,0.08)",
            },
        },
    },
    plugins: [],
};