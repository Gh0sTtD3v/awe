import React from "react";

function WarningIcon({ width = 58, height = 52, fill = "#121212" }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={width}
            height={height}
            fill="none"
            viewBox="0 0 58 52"
        >
            <path
                fill={fill}
                fillRule="evenodd"
                d="M22.305 3.866c3.019-5.155 10.371-5.155 13.39 0l21.199 36.187C59.98 45.323 56.24 52 50.199 52H7.8c-6.04 0-9.782-6.677-6.695-11.947L22.305 3.866zM29 17.499c1.174 0 2.125.966 2.125 2.157v11.5c0 1.19-.951 2.156-2.125 2.156-1.173 0-2.124-.965-2.124-2.156v-11.5c0-1.191.951-2.157 2.124-2.157zm2.833 21.563c0 1.588-1.268 2.875-2.833 2.875-1.564 0-2.832-1.287-2.832-2.875s1.268-2.875 2.832-2.875c1.565 0 2.833 1.287 2.833 2.875z"
                clipRule="evenodd"
            ></path>
        </svg>
    );
}

export default WarningIcon;
