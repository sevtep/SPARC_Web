import { useEffect } from 'react';

const PingAuthRedirect = ({ mode }) => {
  useEffect(() => {
    const target = `https://ping.agaii.org/?auth=${mode}`;
    window.location.href = target;
  }, [mode]);

  return null;
};

export default PingAuthRedirect;
