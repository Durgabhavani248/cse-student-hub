import "./StudentLogin.css";

// Shared video-background shell used by Student, Faculty, and Admin login —
// keeps the video/overlay/glass-card treatment consistent across all three,
// and each login form just renders its own fields as children.
function LoginStage({ children }) {
  return (
    <div className="login-stage">
      <video
        className="login-bg-video"
        autoPlay
        loop
        muted
        playsInline
        poster="/college-poster.jpg"
      >
        <source src="/college-video.mp4" type="video/mp4" />
      </video>
      <div className="login-bg-overlay" />

      <div className="login-card-wrap">
        <div className="login-card">
          {children}
        </div>
      </div>
    </div>
  );
}

export default LoginStage;
