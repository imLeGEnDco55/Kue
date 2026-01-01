/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                neon: {
                    purple: '#8b5cf6',
                    dark: '#0f0f1a',
                },
                cyber: {
                    black: '#000000',
                    gray: '#1e1e1e',
                    text: '#e2e8f0'
                }
            }
        },
    },
    plugins: [],
}
