/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#e8eef7',
                    100: '#c5d4eb',
                    200: '#9eb7dd',
                    300: '#7699cf',
                    400: '#5882c4',
                    500: '#3a6bb9',
                    600: '#2c5a9e',
                    700: '#1e4a82',
                    800: '#153a67',
                    900: '#0c2a4d',
                },
                accent: {
                    50: '#fff9e6',
                    100: '#ffefb3',
                    200: '#ffe480',
                    300: '#ffd94d',
                    400: '#ffce1a',
                    500: '#f5c400',
                    600: '#d4a900',
                    700: '#b38f00',
                    800: '#8c7000',
                    900: '#665200',
                },
                danger: {
                    50: '#fdeaea',
                    100: '#f9c5c5',
                    200: '#f49b9b',
                    300: '#ef7171',
                    400: '#eb5252',
                    500: '#dc3545',
                    600: '#c82333',
                    700: '#a71d2a',
                    800: '#851a22',
                    900: '#63131a',
                },
                lgu: {
                    blue: '#1e4a82',
                    gold: '#f5c400',
                    red: '#dc3545',
                    dark: '#1a1a2e',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
