import React from 'react';
import { Navigate } from 'react-router-dom';

/** Account profile is edited under Settings → Profile tab. */
const Profile = () => <Navigate to="/settings?tab=profile" replace />;

export default Profile;
