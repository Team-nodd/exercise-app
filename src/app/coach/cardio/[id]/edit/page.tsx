import { Suspense } from "react"
import { EditCardioExerciseForm } from "@/components/coach/edit-cardio-exercise-form"

export default function EditCardioTypePage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Cardio Type</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Update cardio template details</p>
        </div>

        <Suspense fallback={<div>Loading cardio type...</div>}>
          <EditCardioExerciseForm cardioId={params.id} />
        </Suspense>
      </div>
    </div>
  )
}

