import API_URL from '../config/api';
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const Login = ({ isRegister }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const location = useLocation();

  // Handle session expiration message
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('expired') === 'true') {
      setError("Your session has expired. Please login again.");
      // Clear the param from the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location.search]);

  const [formData, setFormData] = useState(() => {
    const remembered = localStorage.getItem("rememberedCredentials");
    if (remembered) {
      try {
        const { email, password } = JSON.parse(remembered);
        return {
          name: "",
          email: email || "",
          password: password || "",
          rememberMe: true,
        };
      } catch (e) {
        console.error("Error parsing remembered credentials:", e);
      }
    }
    return {
      name: "",
      email: "",
      password: "",
      rememberMe: false,
    };
  });

  const [showPassword, setShowPassword] = useState(false);

  // Auto-redirect if already logged in, or clear partial session
  useEffect(() => {
    const userString = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (token && userString) {
      try {
        const user = JSON.parse(userString);
        if (user && user.role) {
          const path = user.role === "Admin" ? "/admin" : 
                       user.role === "Manager" ? "/manager-dashboard" : "/employee";
          navigate(path, { replace: true });
          return;
        }
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
    
    // Clear partial session if on login page
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }, [navigate]);

  // Handle form reset and remembered credentials when switching modes
  useEffect(() => {
    setError("");
    
    if (isRegister) {
      setFormData({
        name: "",
        email: "",
        password: "",
        rememberMe: false,
      });
    } else {
      const remembered = localStorage.getItem("rememberedCredentials");
      if (remembered) {
        try {
          const { email, password } = JSON.parse(remembered);
          setFormData({
            name: "",
            email: email || "",
            password: password || "",
            rememberMe: true,
          });
        } catch (e) {
          console.error("Error parsing remembered credentials:", e);
        }
      } else {
        setFormData({
          name: "",
          email: "",
          password: "",
          rememberMe: false,
        });
      }
    }
  }, [isRegister]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
    
    const url = `${API_URL}${endpoint}`;
    console.log('API URL:', url);
    console.log('API_URL from config:', API_URL);

    const trimmedEmail = formData.email.trim().toLowerCase();
    const trimmedPassword = formData.password;
    const trimmedName = formData.name.trim();

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(isRegister ? { name: trimmedName, email: trimmedEmail, password: formData.password, role: "Admin" } : {
          email: trimmedEmail,
          password: trimmedPassword
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (data.success) {
        // Save user data and token
        localStorage.setItem("token", data.user.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        // Handle Remember Me
        if (formData.rememberMe) {
          localStorage.setItem("rememberedCredentials", JSON.stringify({
            email: trimmedEmail,
            password: trimmedPassword
          }));
        } else {
          localStorage.removeItem("rememberedCredentials");
        }

        // Redirect based on role
        const role = data.user.role;
        if (role === "Employee") {
            setError("Employees are only permitted to use the Mobile Application. Web access is restricted.");
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setLoading(false);
            return;
        }

        if (role === "Admin") {
          navigate("/admin");
        } else if (role === "Manager") {
          navigate("/manager-dashboard");
        } else {
          navigate("/employee");
        }
      } else {
        setError(data.message || "An error occurred");
      }
    } catch (err) {
      console.error("Auth Error:", err);
      setError("Failed to connect to the server. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleFlip = (path) => {
    navigate(path);
  };

  return (
    <div className="login-page">
      <div className={`flip-card-inner ${isRegister ? "flipped" : ""}`}>
        {/* LOGIN FORM (FRONT) */}
        <div className="login-container">
          <div className="logo-wrapper">
            <img src="/iipl-horizontal-logo.png" alt="IIPL Logo" />
          </div>

          <p className="login-subtitle">login to access dashboard</p>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} style={{ width: "100%" }}>
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
                <div className="eye-toggle" onClick={togglePasswordVisibility}>
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </div>
              </div>
            </div>

            <div className="remember-forgot">
              <label className="remember-me">
                <input 
                  type="checkbox" 
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                />
                <span>Remember me</span>
              </label>
              <a href="#" className="forgot-link">
                Forgot password?
              </a>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>

            <div className="create-account" style={{ textAlign: "center" }}>
              <span>Don't have an account?</span>
              <a onClick={() => handleFlip("/register")}>Create account →</a>
            </div>
          </form>
        </div>

        {/* REGISTER FORM (BACK) */}
        <div className="login-container register-container">
          <div className="logo-wrapper">
            <img src="/iipl-horizontal-logo.png" alt="IIPL Logo" />
          </div>

          <p className="login-subtitle">Create your account</p>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} style={{ width: "100%" }}>
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  name="name"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
                <div className="eye-toggle" onClick={togglePasswordVisibility}>
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </div>
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Creating account..." : "Sign Up"}
            </button>

            <div className="create-account" style={{ textAlign: "center" }}>
              <span>Already have an account?</span>
              <a onClick={() => handleFlip("/login")}>← Login</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
