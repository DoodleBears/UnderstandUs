import { RoomEntry } from '@/components/RoomEntry'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-4xl font-bold">UnderstandUs</h1>
        <RoomEntry />
      </div>
    </main>
  )
}
