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
                // Accessibility colors - high contrast variants
                'a11y-yellow-dark': "#92400E",  // yellow-800 for text on light backgrounds
                'a11y-yellow-darker': "#78350F", // yellow-900 for maximum contrast
            },

            borderRadius: {
                xl: "1rem",
                '2xl': "1.5rem",
            },

            boxShadow: {
                card: "0 8px 20px rgba(0,0,0,0.08)",
                // Focus ring for accessibility
                'focus-ring': "0 0 0 3px rgba(244, 185, 66, 0.5), 0 0 0 1px rgba(244, 185, 66, 0.8)",
            },

            // Accessibility utilities
            ringWidth: {
                'focus': '3px',
            },
            ringColor: {
                'focus': 'rgba(244, 185, 66, 0.5)',
            },
            ringOffsetColor: {
                'focus': 'rgba(244, 185, 66, 0.8)',
            },
        },
    },
    plugins: [],
};