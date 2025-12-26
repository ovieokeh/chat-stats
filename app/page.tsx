export default async function Home() {
  const today = new Date().toISOString().split("T")[0];

  return <div className="h-full flex flex-col space-y-6">Hello world</div>;
}
