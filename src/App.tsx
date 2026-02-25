// Updated code for src/App.tsx with new features

import React from 'react';
import RegistrationPage from './RegistrationPage';
import UserDisplay from './UserDisplay';
import PaymentMode from './PaymentMode';
import Approval from './Approval';

const App = () => {
  return (
    <div>
      <h1>Bank Transaction App</h1>
      <RegistrationPage />
      <UserDisplay />
      <PaymentMode />
      <Approval />
      {/* Other components and logic */}
    </div>
  );
};

export default App;