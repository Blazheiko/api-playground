import type { ValidationSchema, ResponseType, RateLimit, RouteParameter } from '@/stores/api'

export function getMethodClass(method: string): string {
  return `method-${method.toLowerCase()}`
}

export function getTypeClass(type: string): string {
  const typeClasses: Record<string, string> = {
    string: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    number: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    boolean: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
    enum: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
    unknown: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
  }

  return (typeClasses[type] || typeClasses['unknown']) as string
}

export function extractParameters(url: string): RouteParameter[] {
  const params: RouteParameter[] = []
  const matches = url.match(/:([^/]+)/g)

  if (matches) {
    matches.forEach((match) => {
      params.push({
        name: match.substring(1),
        type: 'path',
        required: true,
      })
    })
  }

  return params
}

export function formatRateLimit(rateLimit?: RateLimit) {
  if (!rateLimit || (!rateLimit.windowMs && !rateLimit.maxRequests)) {
    return null
  }

  const windowMs = rateLimit.windowMs || 0
  const maxRequests = rateLimit.maxRequests || 0

  let timeFormat = ''

  if (windowMs >= 60 * 60 * 1000) {
    const hours = Math.floor(windowMs / (60 * 60 * 1000))
    const minutes = Math.floor((windowMs % (60 * 60 * 1000)) / (60 * 1000))
    timeFormat = hours > 0 ? `${hours}h ${minutes > 0 ? minutes + 'm' : ''}`.trim() : `${minutes}m`
  } else if (windowMs >= 60 * 1000) {
    const minutes = Math.floor(windowMs / (60 * 1000))
    const seconds = Math.floor((windowMs % (60 * 1000)) / 1000)
    timeFormat = `${minutes}m${seconds > 0 ? ` ${seconds}s` : ''}`
  } else if (windowMs >= 1000) {
    const seconds = Math.floor(windowMs / 1000)
    timeFormat = `${seconds}s`
  } else {
    timeFormat = `${windowMs}ms`
  }

  return {
    windowMs,
    maxRequests,
    formatted: `${maxRequests} req/${timeFormat}`,
  }
}

export function generateExampleFromType(typeData: ResponseType) {
  if (!typeData || !typeData.fields) return null

  const example: Record<string, any> = {}

  Object.entries(typeData.fields).forEach(([fieldName, fieldInfo]) => {
    if (fieldInfo.example !== undefined) {
      example[fieldName] = fieldInfo.example
    } else {
      switch (fieldInfo.type) {
        case 'string':
          example[fieldName] = fieldName.includes('email')
            ? 'user@example.com'
            : fieldName.includes('name')
              ? 'Example Name'
              : fieldName.includes('description')
                ? 'Example description'
                : `example_${fieldName}`
          break
        case 'number':
          example[fieldName] = fieldName.includes('id')
            ? 1
            : fieldName.includes('age')
              ? 25
              : fieldName.includes('price')
                ? 99.99
                : 123
          break
        case 'boolean':
          example[fieldName] = true
          break
        case 'array':
          example[fieldName] = []
          break
        case 'object':
          example[fieldName] = {}
          break
        default:
          example[fieldName] = `example_${fieldName}`
      }
    }
  })

  return example
}

export function getDefaultRequestBody(
  validator: string,
  validationSchemas: Record<string, ValidationSchema>,
): string {
  if (validator && validationSchemas[validator]) {
    const schema = validationSchemas[validator]
    const defaultBody: Record<string, any> = {}

    Object.entries(schema).forEach(([fieldName, fieldInfo]) => {
      if (fieldInfo.required) {
        switch (fieldInfo.type) {
          case 'string':
            defaultBody[fieldName] = fieldName.includes('email')
              ? 'user@example.com'
              : fieldName.includes('password')
                ? 'your_password'
                : fieldName.includes('name')
                  ? 'Example Name'
                  : `sample_${fieldName}`
            break
          case 'number':
            defaultBody[fieldName] = fieldName.includes('id')
              ? 1
              : fieldName.includes('age')
                ? 25
                : fieldName.includes('price')
                  ? 99.99
                  : 123
            break
          case 'boolean':
            defaultBody[fieldName] = true
            break
          default:
            defaultBody[fieldName] = `sample_${fieldName}`
        }
      }
    })

    return Object.keys(defaultBody).length > 0
      ? JSON.stringify(defaultBody, null, 2)
      : '{\n  "key": "value"\n}'
  }

  return '{\n  "key": "value"\n}'
}

export function validateJSON(jsonString: string): { isValid: boolean; data?: any; error?: string } {
  if (!jsonString.trim()) {
    return { isValid: true }
  }

  try {
    const parsed = JSON.parse(jsonString)
    return { isValid: true, data: parsed }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid JSON',
    }
  }
}
