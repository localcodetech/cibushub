// Keeps content from stretching too wide on big screens,
// and gives 16px of space on the left and right on phones.
const Container = ({ children }) => {
  return <div className="mx-auto w-full max-w-6xl px-4">{children}</div>;
};

export default Container;
