import { Navigate } from 'react-router-dom';

/** Password reset is handled on the login page (forgot → OTP → new password). */
export default function ForgotPassword() {
  return <Navigate to="/login" replace state={{ initialView: 'forgot' }} />;
}
