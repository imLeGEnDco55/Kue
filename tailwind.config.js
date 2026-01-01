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
            },
            animation: {
                'toast-in': 'toastIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                'fade-in': 'fadeIn 0.3s ease-out forwards',
            },
            keyframes: {
                toastIn: {
                    '0%': { opacity: '0', transform: 'translateX(-50%) translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateX(-50%) translateY(0)' },
                },
                fadeIn: {
                    '0%': { opacity: '0', transform: 'scale(1.02)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                }
            }
        },
    },
    plugins: [],
}
