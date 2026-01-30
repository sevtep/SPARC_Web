import { useEffect } from 'react';

const PingAuthRedirect = ({ mode }) => {
  useEffect(() => {
    const returnUrl = encodeURIComponent(window.location.origin);
    const target = `https://ping.agaii.org/?auth=${mode}&return=${returnUrl}`;
    window.location.href = target;
  }, [mode]);

  return null;
};

export default PingAuthRedirect;
