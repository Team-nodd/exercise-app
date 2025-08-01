import { EditExerciseForm } from "@/components/coach/edit-exercise-form"
import { Suspense } from "react"
// import { EditExerciseForm } from "@/components/coach/edit-exercise-form"

export default function EditExercisePage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Exercise</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Update exercise details and instructions</p>
        </div>

        <Suspense fallback={<div>Loading exercise...</div>}>
          <EditExerciseForm exerciseId={params.id} />
        </Suspense>
      </div>
    </div>
  )
}
