{propertiesError && (
  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
    <p className="text-sm font-semibold text-red-700">
      Unable to load properties.
    </p>

    <p className="text-xs text-red-600 mt-2 break-words">
      {propertiesError.message}
    </p>
  </div>
)}