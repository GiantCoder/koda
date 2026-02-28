import Link from 'next/link'

const NotFound = () => {
  return (
    <div>
        <h1>404 - Page Not Found</h1>
        <p>Oop! Played and missed! 🏏</p>
        <Link href="/">Go to Home</Link>
    </div>
  );
};

export default NotFound;