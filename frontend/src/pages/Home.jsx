import axios from "axios";
import { useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Home() {
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [resumePreviewUrl, setResumePreviewUrl] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const validateExistingSession = async () => {
      const token = localStorage.getItem("resumeAnalyzerToken");
      if (!token) {
        setIsLoggedIn(false);
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setIsLoggedIn(true);
        setUserEmail(response.data?.user?.email || "");
      } catch (error) {
        localStorage.removeItem("resumeAnalyzerToken");
        setIsLoggedIn(false);
        setUserEmail("");
      }
    };

    validateExistingSession();
  }, []);

  useEffect(() => {
    if (!file) {
      setResumePreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setResumePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleAuth = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      alert("Please enter email and password");
      return;
    }

    try {
      setAuthLoading(true);

      const endpoint = authMode === "register" ? "/auth/register" : "/auth/login";
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, {
        email: email.trim(),
        password: password.trim()
      });

      const token = response.data?.token;
      if (!token) {
        throw new Error("Missing auth token");
      }

      localStorage.setItem("resumeAnalyzerToken", token);
      localStorage.removeItem("resumeAnalyzerLoggedIn");
      setIsLoggedIn(true);
      setUserEmail(response.data?.user?.email || email.trim());
      setPassword("");
    } catch (error) {
      console.error(error.response?.data || error);
      if (!error.response) {
        alert("Cannot reach backend API. Please start backend server on http://localhost:5000 or set VITE_API_URL.");
      } else {
        alert(error.response?.data?.message || "Authentication failed");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("resumeAnalyzerToken");
    localStorage.removeItem("resumeAnalyzerLoggedIn");
    setIsLoggedIn(false);
    setUserEmail("");
    setFile(null);
    setAnalysis(null);
    setJobDescription("");
    setEmail("");
    setPassword("");
  };

  const handleUpload = async () => {
  const token = localStorage.getItem("resumeAnalyzerToken");

  if (!token) {
    alert("Please login first");
    setIsLoggedIn(false);
    return;
  }

  if (!file) {
    alert("Please select a resume first");
    return;
  }

  if (loading) return;
  setLoading(true);

  const formData = new FormData();
  formData.append("resume", file);
  formData.append("jobDescription", jobDescription);

  try {

    const response = await axios.post(
      `${API_BASE_URL}/upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`
        },
        timeout: 120000
      }
    );

    alert("Resume uploaded successfully!");
    try {
      const parsed = JSON.parse(response.data.analysis);
      console.log(parsed);
      setAnalysis(parsed);
    } catch (err) {
      console.error("JSON parse error:", err);
      setAnalysis({ score: "-", skills: [], missing_skills: [], strengths: [], improvements: [] });
    }
    console.log(response.data);

  } catch (error) {

    console.error(error.response?.data || error);
    if (error.response?.status === 401) {
      handleLogout();
      alert("Session expired. Please login again.");
      return;
    }
    alert(error.response?.data?.message || "Upload failed");

  } finally {
    setLoading(false);
  }

};

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100 text-stone-900 px-4 py-10">
      <div className="w-full max-w-7xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold mb-3 text-center">
          AI Resume Analyzer 🚀
        </h1>

        <p className="text-stone-600 mb-10 text-lg text-center">
          Upload your resume and get AI insights
        </p>

        {isLoggedIn && (
          <div className="flex justify-end mb-6">
            {userEmail && (
              <p className="text-stone-600 mr-4 self-center text-sm sm:text-base">Logged in as {userEmail}</p>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-stone-800 text-white hover:bg-stone-900 transition"
            >
              Logout
            </button>
          </div>
        )}

        {!isLoggedIn && (
          <div className="max-w-md mx-auto bg-white/85 backdrop-blur-md p-6 sm:p-8 rounded-2xl shadow-xl border border-stone-200">
            <h2 className="text-2xl font-semibold mb-6 text-center">
              {authMode === "register" ? "Create Account" : "Login to Continue"}
            </h2>

            <form onSubmit={handleAuth}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 mb-4 bg-white border border-stone-300 rounded-lg text-stone-900"
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 mb-6 bg-white border border-stone-300 rounded-lg text-stone-900"
              />

              <button
                type="submit"
                disabled={authLoading}
                className={`w-full transition duration-300 px-4 py-3 rounded-lg font-semibold text-white ${authLoading ? "bg-blue-800 cursor-not-allowed opacity-70" : "bg-blue-600 hover:bg-blue-700"}`}
              >
                {authLoading ? "Please wait..." : authMode === "register" ? "Create Account" : "Login"}
              </button>

              <button
                type="button"
                onClick={() => setAuthMode((prev) => (prev === "login" ? "register" : "login"))}
                className="w-full mt-3 transition duration-300 px-4 py-2 rounded-lg font-semibold border border-stone-300 text-stone-700 hover:bg-stone-100"
              >
                {authMode === "login" ? "New user? Create account" : "Already have an account? Login"}
              </button>
            </form>
          </div>
        )}

        {isLoggedIn && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white/80 backdrop-blur-md p-6 sm:p-8 rounded-2xl shadow-xl border border-stone-200 w-full lg:sticky lg:top-6 self-start">
            <h2 className="text-2xl font-semibold mb-6">Upload Resume</h2>

            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="mb-6 text-stone-700"
            />

            <textarea
              placeholder="Paste job description here (optional)"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="w-full p-3 mb-6 bg-white border border-stone-300 rounded-lg text-stone-900"
              rows="6"
            />

            {file && (
              <p className="text-green-600 text-sm mb-4">
                Selected: {file.name}
              </p>
            )}

            <button
              onClick={handleUpload}
              disabled={loading}
              className={`w-full transition duration-300 px-4 py-3 rounded-lg font-semibold text-white ${loading ? "bg-blue-800 cursor-not-allowed opacity-70" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {loading ? "Analyzing..." : "Analyze Resume"}
            </button>

            {resumePreviewUrl && (
              <div className="mt-6">
                <p className="font-semibold mb-3 text-stone-700">Resume Preview</p>
                <iframe
                  src={resumePreviewUrl}
                  title="Uploaded Resume Preview"
                  className="w-full h-[420px] rounded-xl border border-stone-300 bg-white"
                />
              </div>
            )}
          </div>

          <div className="bg-white/85 backdrop-blur-md p-6 sm:p-8 rounded-2xl shadow-xl border border-stone-200 w-full lg:min-h-[620px]">
            <h2 className="text-2xl font-semibold mb-5 text-blue-600">AI Resume Analysis</h2>

            {!analysis && (
              <div className="h-full min-h-[520px] flex items-center justify-center text-center text-stone-500 border border-dashed border-stone-300 rounded-xl px-6">
                Upload your resume and click Analyze Resume to see results here.
              </div>
            )}

            {analysis && (
              <div>
                {analysis.match_score && (
                  <div className="mb-4">
                    <p className="font-semibold text-purple-500 mb-2">Job Match Score</p>
                    <div className="w-full bg-stone-200 rounded-full h-4">
                      <div
                        className="bg-purple-500 h-4 rounded-full"
                        style={{ width: `${analysis.match_score}%` }}
                      ></div>
                    </div>
                    <p className="mt-2 text-sm text-stone-600">{analysis.match_score}% match</p>
                  </div>
                )}

                <div className="mb-6">
                  <p className="font-semibold mb-2">Resume Score</p>
                  <div className="w-full bg-stone-200 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full transition-all duration-500 ${
                        analysis.score > 80
                          ? "bg-green-500"
                          : analysis.score > 60
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${analysis.score}%` }}
                    ></div>
                  </div>
                  <p className="mt-2 text-sm text-stone-600">{analysis.score}/100</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="font-semibold text-green-500 mb-2">Skills:</p>
                    <ul className="list-disc ml-6 space-y-1">
                      {analysis.skills?.map((skill, i) => (
                        <li key={i}>{skill}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold text-purple-500 mb-2">Matched Skills:</p>
                    <ul className="list-disc ml-6 space-y-1">
                      {analysis.matched_skills?.map((skill, i) => (
                        <li key={i}>{skill}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold text-yellow-500 mb-2">Missing Skills:</p>
                    <ul className="list-disc ml-6 space-y-1">
                      {analysis.missing_skills?.map((skill, i) => (
                        <li key={i}>{skill}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold text-blue-500 mb-2">Strengths:</p>
                    <ul className="list-disc ml-6 space-y-1">
                      {analysis.strengths?.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="font-semibold text-red-500 mb-2">Improvements:</p>
                  <ul className="list-disc ml-6 space-y-1">
                    {analysis.improvements?.map((imp, i) => (
                      <li key={i}>{imp}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

export default Home;