// API Documentation JavaScript

// Global route data - will be populated from API
let httpRouteGroups = [];
let wsRouteGroups = [];
let validationSchemas = {};
let responseTypes = {};
let handlerTypeMapping = {};

// Global state variables
let currentRouteType = 'http'; // 'http' or 'ws'
let currentFilter = 'all';
let searchTerm = '';

// Utility functions
function getMethodClass(method) {
    return `method-${method.toLowerCase()}`;
}

function renderValidationSchema(schema) {
    if (!schema || typeof schema !== 'object') {
        return '<div class="text-gray-500 dark:text-gray-400 text-sm">No validation schema available</div>';
    }

    const fields = Object.entries(schema)
        .map(([fieldName, fieldInfo]) => {
            const typeClass = getTypeClass(fieldInfo.type);
            const requiredBadge = fieldInfo.required
                ? '<span class="text-red-500 dark:text-red-400 text-xs whitespace-nowrap">required</span>'
                : '<span class="text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">optional</span>';

            return `
            <div class="border-l-2 border-gray-200 dark:border-gray-600 pl-3 py-2">
                <div class="flex flex-wrap items-center gap-2 text-sm mb-1">
                    <span class="px-2 py-1 ${typeClass} rounded text-xs font-mono font-semibold break-all">${fieldName}</span>
                    <span class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">${fieldInfo.type}</span>
                    ${requiredBadge}
                </div>
                ${fieldInfo.description ? `<div class="text-gray-600 dark:text-gray-400 text-xs break-words mt-1">${fieldInfo.description}</div>` : ''}
            </div>
        `;
        })
        .join('');

    return (
        fields ||
        '<div class="text-gray-500 dark:text-gray-400 text-sm">No fields defined</div>'
    );
}

function getTypeClass(type) {
    const typeClasses = {
        string: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
        number: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
        boolean:
            'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
        enum: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
        unknown:
            'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
    };

    return typeClasses[type] || typeClasses['unknown'];
}

function extractParameters(url) {
    const params = [];
    const matches = url.match(/:([^/]+)/g);
    if (matches) {
        matches.forEach((match) => {
            params.push({
                name: match.substring(1),
                type: 'path',
                required: true,
            });
        });
    }
    return params;
}

function formatRateLimit(rateLimit) {
    if (!rateLimit || (!rateLimit.windowMs && !rateLimit.maxRequests)) {
        return null;
    }

    const windowMs = rateLimit.windowMs || 0;
    const maxRequests = rateLimit.maxRequests || 0;

    // Convert milliseconds to human readable format
    let timeFormat = '';
    if (windowMs >= 60 * 60 * 1000) {
        const hours = Math.floor(windowMs / (60 * 60 * 1000));
        const minutes = Math.floor((windowMs % (60 * 60 * 1000)) / (60 * 1000));
        timeFormat =
            hours > 0
                ? `${hours}h ${minutes > 0 ? minutes + 'm' : ''}`.trim()
                : `${minutes}m`;
    } else if (windowMs >= 60 * 1000) {
        const minutes = Math.floor(windowMs / (60 * 1000));
        const seconds = Math.floor((windowMs % (60 * 1000)) / 1000);
        timeFormat = `${minutes}m${seconds > 0 ? ` ${seconds}s` : ''}`;
    } else if (windowMs >= 1000) {
        const seconds = Math.floor(windowMs / 1000);
        timeFormat = `${seconds}s`;
    } else {
        timeFormat = `${windowMs}ms`;
    }

    return {
        windowMs: windowMs,
        maxRequests: maxRequests,
        formatted: `${maxRequests} req/${timeFormat}`,
    };
}

function getResponseFormat(handler) {
    // Mock response formats based on handler patterns
    const responseFormats = {
        get: {
            success: {
                status: 200,
                data: 'Object or Array depending on endpoint',
            },
            error: {
                status: 404,
                message: 'Resource not found',
            },
        },
        post: {
            success: {
                status: 201,
                data: 'Created resource object',
                message: 'Resource created successfully',
            },
            error: {
                status: 400,
                message: 'Validation error',
            },
        },
        put: {
            success: {
                status: 200,
                data: 'Updated resource object',
                message: 'Resource updated successfully',
            },
            error: {
                status: 404,
                message: 'Resource not found',
            },
        },
        delete: {
            success: {
                status: 200,
                message: 'Resource deleted successfully',
            },
            error: {
                status: 404,
                message: 'Resource not found',
            },
        },
    };
    return responseFormats;
}

function renderResponseSchema(responseSchema, handlerName) {
    // If responseSchema is provided from route definition, use it (legacy)
    if (responseSchema && responseSchema.schema) {
        return renderSchemaFields(responseSchema.schema);
    }

    // Otherwise, try to get type from responseTypes using handlerName
    if (handlerName && handlerTypeMapping[handlerName]) {
        const typeName = handlerTypeMapping[handlerName];
        const typeData = responseTypes[typeName];

        if (typeData && typeData.fields) {
            return renderSchemaFields(typeData.fields);
        }
    }

    return null;
}

function generateExampleFromType(typeData) {
    if (!typeData || !typeData.fields) return null;

    const example = {};
    Object.entries(typeData.fields).forEach(([fieldName, fieldInfo]) => {
        if (fieldInfo.example !== undefined) {
            example[fieldName] = fieldInfo.example;
        } else {
            // Generate example based on type
            switch (fieldInfo.type) {
                case 'string':
                    example[fieldName] = fieldName.includes('email')
                        ? 'user@example.com'
                        : fieldName.includes('name')
                          ? 'Example Name'
                          : fieldName.includes('description')
                            ? 'Example description'
                            : `example_${fieldName}`;
                    break;
                case 'number':
                    example[fieldName] = fieldName.includes('id')
                        ? 1
                        : fieldName.includes('age')
                          ? 25
                          : fieldName.includes('price')
                            ? 99.99
                            : 123;
                    break;
                case 'boolean':
                    example[fieldName] = true;
                    break;
                case 'array':
                    example[fieldName] = [];
                    break;
                case 'object':
                    example[fieldName] = {};
                    break;
                default:
                    example[fieldName] = `example_${fieldName}`;
            }
        }
    });

    return example;
}

function renderDetailedResponseFormat(handlerName, route) {
    const responseTypeInfo = getResponseTypeInfo(handlerName);
    const responseFormats = getResponseFormat(route.handler);

    if (responseTypeInfo && responseTypeInfo.hasFields) {
        const exampleData = generateExampleFromType(responseTypeInfo.data);

        return `
            <div class="space-y-3">
                <!-- Detailed Response Type -->
                <div class="response-type-section">
                    <div class="flex items-center gap-2 mb-3">
                        <span class="response-type-badge">${responseTypeInfo.name}</span>
                        <span class="text-sm text-gray-600 dark:text-gray-400 font-medium">Response Type</span>
                    </div>
                    <div class="space-y-2 overflow-x-auto">
                        ${renderResponseTypeFields(responseTypeInfo.data)}
                    </div>
                    ${
                        exampleData && Object.keys(exampleData).length > 0
                            ? `
                        <div class="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                            <h6 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Example Response</h6>
                            <pre class="text-xs bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-2 rounded border dark:border-gray-600 overflow-x-auto"><code>${JSON.stringify(exampleData, null, 2)}</code></pre>
                        </div>
                    `
                            : ''
                    }
                </div>

                <!-- Success Response Format -->
                <div>
                    <h6 class="text-sm font-medium text-green-700 dark:text-green-400 mb-1">Success Response Format</h6>
                    <pre class="text-xs bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-2 rounded border dark:border-gray-600 overflow-x-auto"><code>${JSON.stringify(responseFormats[route.method]?.success || { status: 200, data: 'Success' }, null, 2)}</code></pre>
                </div>

                <!-- Error Response Format -->
                <div>
                    <h6 class="text-sm font-medium text-red-700 dark:text-red-400 mb-1">Error Response Format</h6>
                    <pre class="text-xs bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-2 rounded border dark:border-gray-600 overflow-x-auto"><code>${JSON.stringify(responseFormats[route.method]?.error || { status: 400, message: 'Error' }, null, 2)}</code></pre>
                </div>
            </div>
        `;
    } else if (responseTypeInfo && responseTypeInfo.name) {
        // We have a type but no fields - show just the type name with response formats
        return `
            <div class="space-y-3">
                <!-- Response Type Name -->
                <div class="response-type-section">
                    <div class="flex items-center gap-2 mb-3">
                        <span class="response-type-badge">${responseTypeInfo.name}</span>
                        <span class="text-sm text-gray-600 dark:text-gray-400 font-medium">Response Type</span>
                    </div>
                    <div class="text-sm text-gray-500 dark:text-gray-400 italic">
                        Type defined but no field details available
                    </div>
                </div>

                <!-- Success Response Format -->
                <div>
                    <h6 class="text-sm font-medium text-green-700 dark:text-green-400 mb-1">Success Response Format</h6>
                    <pre class="text-xs bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-2 rounded border dark:border-gray-600 overflow-x-auto"><code>${JSON.stringify(responseFormats[route.method]?.success || { status: 200, data: 'Success' }, null, 2)}</code></pre>
                </div>

                <!-- Error Response Format -->
                <div>
                    <h6 class="text-sm font-medium text-red-700 dark:text-red-400 mb-1">Error Response Format</h6>
                    <pre class="text-xs bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-2 rounded border dark:border-gray-600 overflow-x-auto"><code>${JSON.stringify(responseFormats[route.method]?.error || { status: 400, message: 'Error' }, null, 2)}</code></pre>
                </div>
            </div>
        `;
    }

    // Fallback to generic response format only
    return `
        <div class="space-y-3">
            <div>
                <h6 class="text-sm font-medium text-green-700 dark:text-green-400 mb-1">Success Response</h6>
                <pre class="text-xs bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-2 rounded border dark:border-gray-600 overflow-x-auto"><code>${JSON.stringify(responseFormats[route.method]?.success || { status: 200, data: 'Success' }, null, 2)}</code></pre>
            </div>
            <div>
                <h6 class="text-sm font-medium text-red-700 dark:text-red-400 mb-1">Error Response</h6>
                <pre class="text-xs bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-2 rounded border dark:border-gray-600 overflow-x-auto"><code>${JSON.stringify(responseFormats[route.method]?.error || { status: 400, message: 'Error' }, null, 2)}</code></pre>
            </div>
        </div>
    `;
}

function getResponseTypeInfo(handlerName) {
    console.log(`Getting response type info for handler: ${handlerName}`);
    console.log(
        'Available handlers in mapping:',
        Object.keys(handlerTypeMapping),
    );

    // Skip if handler name is invalid
    if (
        !handlerName ||
        handlerName === 'Unknown handler' ||
        handlerName === 'unknown'
    ) {
        console.log(`Skipping invalid handler name: ${handlerName}`);
        return null;
    }

    if (handlerTypeMapping[handlerName]) {
        const typeName = handlerTypeMapping[handlerName];
        const typeData = responseTypes[typeName];

        console.log(`Found type mapping: ${handlerName} -> ${typeName}`);
        console.log(`Type data for ${typeName}:`, typeData);

        if (typeData) {
            const result = {
                name: typeName,
                data: typeData,
                hasFields:
                    typeData.fields && Object.keys(typeData.fields).length > 0,
            };
            console.log(`Returning response type info:`, result);
            return result;
        } else {
            console.log(`Type data not found for type: ${typeName}`);
        }
    } else {
        console.log(`Handler not found in mapping: ${handlerName}`);
    }

    console.log(`No response type found for handler: ${handlerName}`);
    return null;
}

function renderSchemaFields(schema) {
    if (!schema) return null;

    const fields = Object.entries(schema)
        .map(([fieldName, fieldInfo]) => {
            const typeClass = getTypeClass(fieldInfo.type);
            const requiredBadge = fieldInfo.required
                ? '<span class="text-red-500 dark:text-red-400 text-xs whitespace-nowrap font-medium">required</span>'
                : '<span class="text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">optional</span>';

            let fieldContent = `
            <div class="response-field-item">
                <div class="flex flex-wrap items-center gap-2 text-sm mb-1">
                    <span class="field-name-badge ${typeClass}">${fieldName}</span>
                    <span class="field-type-badge">${fieldInfo.type}</span>
                    ${requiredBadge}
                </div>
                ${fieldInfo.description ? `<div class="field-description">${fieldInfo.description}</div>` : ''}
                ${fieldInfo.example !== undefined ? `<div class="field-example">Example: ${JSON.stringify(fieldInfo.example)}</div>` : ''}
        `;

            // Handle nested objects
            if (fieldInfo.type === 'object' && fieldInfo.properties) {
                fieldContent += '<div class="ml-4 mt-2 space-y-1">';
                Object.entries(fieldInfo.properties).forEach(
                    ([propName, propInfo]) => {
                        const propTypeClass = getTypeClass(propInfo.type);
                        fieldContent += `
                    <div class="flex flex-wrap items-center gap-2 text-xs">
                        <span class="field-name-badge ${propTypeClass}">${propName}</span>
                        <span class="field-type-badge">${propInfo.type}</span>
                        ${propInfo.example !== undefined ? `<span class="field-example">e.g. ${JSON.stringify(propInfo.example)}</span>` : ''}
                    </div>
                `;
                    },
                );
                fieldContent += '</div>';
            }

            fieldContent += '</div>';
            return fieldContent;
        })
        .join('');

    return fields;
}

function renderResponseTypeFields(typeData) {
    if (!typeData || !typeData.fields) return null;

    return renderSchemaFields(typeData.fields);
}

function renderRequestBodySchema(requestBody) {
    if (!requestBody || !requestBody.schema) {
        return null;
    }

    return renderValidationSchema(requestBody.schema);
}

// Rendering functions
function renderRoute(route, prefix, routeId) {
    // For WebSocket routes, handle URL differently
    const isWebSocket = currentRouteType === 'ws';
    let fullUrl;

    if (isWebSocket) {
        // WebSocket routes don't have leading slash and use different prefix format
        fullUrl = route.url;
    } else {
        // HTTP routes
        const cleanUrl = route.url.startsWith('/')
            ? route.url
            : `/${route.url}`;
        fullUrl = cleanUrl;
    }

    const parameters = extractParameters(route.url);
    const responseFormats = getResponseFormat(route.handler);

    // Handle case where handler might be a function reference or string
    console.log('Route handler:', route.handler);
    console.log('Handler type:', typeof route.handler);

    let handlerName = 'Unknown handler';

    if (typeof route.handler === 'string') {
        handlerName = route.handler;
    } else if (route.handler && typeof route.handler === 'function') {
        // Get the function name - this should match the backend logic
        handlerName = route.handler.name || 'unknown';
    } else if (route.handler && route.handler.name) {
        handlerName = route.handler.name;
    }

    console.log('Extracted handler name:', handlerName);

    // Get response type for this handler
    const responseTypeInfo = getResponseTypeInfo(handlerName);
    const hasResponseType = responseTypeInfo && responseTypeInfo.hasFields;

    // For WebSocket routes, show different method badge
    const methodDisplay = isWebSocket ? 'WS' : route.method.toUpperCase();
    const methodClass = isWebSocket
        ? 'method-ws'
        : getMethodClass(route.method);

    return `
        <div class="route-item border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 transition-shadow duration-200 fade-in" data-method="${isWebSocket ? 'ws' : route.method}">
            <!-- Collapsed Header -->
            <div class="route-collapsed p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200" onclick="toggleRoute('${routeId}')">
                <div class="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-0 lg:justify-between">
                    <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <div class="flex items-center gap-3 flex-wrap">
                            <span class="px-3 py-1 text-xs font-semibold rounded-full border ${methodClass} flex-shrink-0">
                                ${methodDisplay}
                            </span>
                            <code class="text-sm font-mono text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded break-all">${fullUrl}</code>
                        </div>
                        <div class="flex-1 min-w-0">
                            <span class="text-gray-600 dark:text-gray-300 text-sm break-words">${route.description || 'No description available'}</span>
                        </div>
                    </div>
                    <div class="flex items-center justify-between lg:justify-end gap-2 flex-shrink-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            ${route.validator ? '<span class="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full whitespace-nowrap">Validated</span>' : ''}
                            ${route.middleware ? '<span class="px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded-full whitespace-nowrap">Middleware</span>' : ''}
                            ${(() => {
                                const routeRateLimit = formatRateLimit(
                                    route.rateLimit,
                                );
                                return routeRateLimit
                                    ? `<span class="px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full whitespace-nowrap">${routeRateLimit.formatted}</span>`
                                    : '';
                            })()}
                            ${!isWebSocket ? `<button onclick="event.stopPropagation(); toggleTestForm('${routeId}')" class="px-3 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors duration-200 whitespace-nowrap focus:ring-2 focus:ring-green-300 focus:outline-none">Test</button>` : ''}
                        </div>
                        <svg class="expand-icon h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </div>
                </div>
            </div>

            <!-- Expanded Details -->
            <div class="route-details" id="details-${routeId}">
                <div class="px-4 pb-4">
                    <div class="flex flex-col lg:grid lg:grid-cols-2 gap-6">
                        <div class="space-y-4">
                            <div>
                                <h5 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">Details</h5>
                                <div class="space-y-1 text-sm">
                                    ${route.middleware ? `<div class="break-words"><span class="font-medium text-gray-700 dark:text-gray-300">Middleware:</span> <code class="text-orange-600 dark:text-orange-400 break-all">${route.middleware}</code></div>` : ''}
                                    ${route.middlewares ? `<div class="break-words"><span class="font-medium text-gray-700 dark:text-gray-300">Middlewares:</span> <code class="text-orange-600 dark:text-orange-400 break-all">${route.middlewares.join(', ')}</code></div>` : ''}
                                    ${(() => {
                                        const routeRateLimit = formatRateLimit(
                                            route.rateLimit,
                                        );
                                        return routeRateLimit
                                            ? `<div class="break-words"><span class="font-medium text-gray-700 dark:text-gray-300">Rate Limit:</span> <span class="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-xs font-mono">${routeRateLimit.formatted}</span> <span class="text-gray-500 dark:text-gray-400 text-xs">(overrides group limit)</span></div>`
                                            : '';
                                    })()}
                                </div>
                            </div>

                            ${
                                route.validator &&
                                validationSchemas[route.validator]
                                    ? `
                                <div>
                                    <h5 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">Validation Schema</h5>
                                    <div class="space-y-2 overflow-x-auto">
                                        ${renderValidationSchema(validationSchemas[route.validator])}
                                    </div>
                                </div>
                            `
                                    : ''
                            }

                            ${
                                parameters.length > 0
                                    ? `
                                <div>
                                    <h5 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">Parameters</h5>
                                    <div class="space-y-2">
                                        ${parameters
                                            .map(
                                                (param) => `
                                            <div class="flex flex-wrap items-center gap-2 text-sm">
                                                <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-mono break-all">${param.name}</span>
                                                <span class="text-gray-500 dark:text-gray-400">${param.type}</span>
                                                ${param.required ? '<span class="text-red-500 dark:text-red-400 text-xs whitespace-nowrap">required</span>' : '<span class="text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">optional</span>'}
                                            </div>
                                        `,
                                            )
                                            .join('')}
                                    </div>
                                </div>
                            `
                                    : ''
                            }
                        </div>

                        <div class="space-y-4">
                            ${
                                route.requestBody
                                    ? `
                                <div>
                                    <h5 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">Request Body</h5>
                                    ${route.requestBody.description ? `<p class="text-sm text-gray-600 dark:text-gray-400 mb-2">${route.requestBody.description}</p>` : ''}
                                    <div class="space-y-2 overflow-x-auto">
                                        ${renderRequestBodySchema(route.requestBody) || '<div class="text-gray-500 dark:text-gray-400 text-sm">No schema available</div>'}
                                    </div>
                                    ${
                                        route.requestBody.example
                                            ? `
                                        <div class="mt-2">
                                            <h6 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Example</h6>
                                            <pre class="text-xs bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-2 rounded border dark:border-gray-600 overflow-x-auto"><code>${JSON.stringify(route.requestBody.example, null, 2)}</code></pre>
                                        </div>
                                    `
                                            : ''
                                    }
                                </div>
                            `
                                    : ''
                            }

                            <div>
                                <h5 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">Response Format</h5>
                                ${renderDetailedResponseFormat(handlerName, route)}
                            </div>
                        </div>
                    </div>

                    <!-- Test Form Section -->
                    ${
                        !isWebSocket
                            ? `
                        <div id="test-form-${routeId}" class="test-form-section" style="display: none;">
                            <div class="border-t dark:border-gray-600 pt-6 mt-6">
                                <h5 class="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                                    <svg class="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    API Testing
                                </h5>

                                <form class="space-y-4" data-route-id="${routeId}" onsubmit="sendTestRequest(event, '${routeId}', '${route.method.toUpperCase()}', '${fullUrl}', '${route.validator || ''}')">
                                    <!-- URL Parameters -->
                                    ${
                                        parameters.length > 0
                                            ? `
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">URL Parameters</label>
                                            <div class="space-y-2">
                                                ${parameters
                                                    .map(
                                                        (param) => `
                                                    <div class="flex items-center gap-2">
                                                        <label class="min-w-[80px] text-sm text-gray-600 dark:text-gray-400">${param.name}:</label>
                                                        <input
                                                            type="text"
                                                            name="param-${param.name}"
                                                            placeholder="Enter ${param.name}"
                                                            class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                            ${param.required ? 'required' : ''}
                                                        >
                                                    </div>
                                                `,
                                                    )
                                                    .join('')}
                                            </div>
                                        </div>
                                    `
                                            : ''
                                    }

                                    <!-- Request Headers -->
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Headers (JSON format)</label>
                                        <textarea
                                            name="headers"
                                            rows="3"
                                            data-error-target="headers-error-${routeId}"
                                            placeholder='{"Content-Type": "application/json", "Authorization": "Bearer token"}'
                                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono"
                                        >{\n  "Content-Type": "application/json"\n}</textarea>
                                    </div>

                                    <!-- Request Body (for POST/PUT) -->
                                    ${
                                        ['POST', 'PUT', 'PATCH'].includes(
                                            route.method.toUpperCase(),
                                        )
                                            ? `
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Request Body (JSON format)</label>
                                            <textarea
                                                name="body"
                                                rows="6"
                                                data-error-target="body-error-${routeId}"
                                                placeholder='{"key": "value"}'
                                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono"
                                            >${getDefaultRequestBody(route.validator || '')}</textarea>
                                        </div>
                                    `
                                            : ''
                                    }

                                    <!-- Request Count and Buttons -->
                                    <div class="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                                        <div class="flex flex-col flex-1 sm:flex-initial">
                                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Requests count</label>
                                            <input
                                                type="number"
                                                name="requestCount"
                                                min="1"
                                                max="1000"
                                                value="1"
                                                class="form-element-height w-full sm:w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-center"
                                            >
                                        </div>
                                        <button
                                            type="submit"
                                            class="form-element-height px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors duration-200 focus:ring-2 focus:ring-green-500 focus:outline-none flex items-center justify-center gap-2 whitespace-nowrap"
                                        >
                                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                                            </svg>
                                            Send Request
                                        </button>
                                        <button
                                            type="button"
                                            onclick="clearTestResult('${routeId}')"
                                            class="form-element-height px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors duration-200 text-sm flex items-center justify-center whitespace-nowrap"
                                        >
                                            Clear Result
                                        </button>
                                    </div>
                                </form>

                                <!-- Response Section -->
                                <div id="test-result-${routeId}" class="test-result-section mt-6" style="display: none;">
                                    <div class="border-t dark:border-gray-600 pt-4">
                                        <h6 class="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                            <svg class="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                            </svg>
                                            Response
                                        </h6>
                                        <div id="test-response-${routeId}"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `
                            : ''
                    }
                </div>
            </div>
        </div>
    `;
}

function renderGroup(group, index) {
    const groupName = group.description || `Group ${index + 1}`;
    const routes = group.group || [];
    const groupRateLimit = formatRateLimit(group.rateLimit);

    return `
        <div class="group-item bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden fade-in">
            <div class="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-gray-700 dark:to-gray-600 px-4 sm:px-6 py-4 border-b dark:border-gray-600">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div class="flex-1 min-w-0">
                        <h3 class="text-lg sm:text-xl font-bold text-gray-900 dark:text-white break-words">${groupName}</h3>
                        <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
                            <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                <span class="font-medium whitespace-nowrap">Prefix:</span>
                                <code class="bg-white dark:bg-gray-800 px-2 py-1 rounded text-primary-700 dark:text-primary-400 break-all">/${group.prefix}</code>
                            </div>
                            ${
                                group.middlewares
                                    ? `
                                <div class="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                                    <span class="font-medium whitespace-nowrap">Middlewares:</span>
                                    <code class="bg-white dark:bg-gray-800 px-2 py-1 rounded text-orange-700 dark:text-orange-400 break-all flex-1 min-w-0">${group.middlewares.join(', ')}</code>
                                </div>
                            `
                                    : ''
                            }
                            ${
                                groupRateLimit
                                    ? `
                                <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                    <span class="font-medium whitespace-nowrap">Rate Limit:</span>
                                    <span class="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-xs font-mono whitespace-nowrap">${groupRateLimit.formatted}</span>
                                </div>
                            `
                                    : ''
                            }
                        </div>
                    </div>
                    <div class="text-center sm:text-right flex-shrink-0 self-start sm:self-center">
                        <div class="text-xl sm:text-2xl font-bold text-primary-600 dark:text-primary-400">${routes.length}</div>
                        <div class="text-xs sm:text-sm text-gray-600 dark:text-gray-300">endpoints</div>
                    </div>
                </div>
            </div>

            <div class="p-6">
                <div class="space-y-4">
                    ${routes
                        .map((route, routeIndex) => {
                            const routeId = `route-${index}-${routeIndex}`;
                            return renderRoute(route, group.prefix, routeId);
                        })
                        .join('')}
                </div>
            </div>
        </div>
    `;
}

function renderDocumentation() {
    // Select the appropriate route groups based on current type
    const routeGroups =
        currentRouteType === 'http' ? httpRouteGroups : wsRouteGroups;

    const filteredGroups = routeGroups
        .map((group) => {
            if (currentFilter === 'all' && !searchTerm) return group;

            const filteredRoutes = group.group.filter((route) => {
                // For WebSocket routes, we don't filter by method since they don't have HTTP methods
                const matchesFilter =
                    currentRouteType === 'ws' ||
                    currentFilter === 'all' ||
                    (route.method &&
                        route.method.toLowerCase() === currentFilter);

                const matchesSearch =
                    !searchTerm ||
                    route.url
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                    (route.description &&
                        route.description
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase())) ||
                    (typeof route.handler === 'string' &&
                        route.handler
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase()));

                return matchesFilter && matchesSearch;
            });

            return { ...group, group: filteredRoutes };
        })
        .filter((group) => group.group.length > 0);

    const apiGroupsContainer = document.getElementById('apiGroups');
    apiGroupsContainer.innerHTML = filteredGroups
        .map((group, index) => renderGroup(group, index))
        .join('');

    // updateStats(filteredGroups);
}

// function updateStats(groups) {
//     const totalEndpoints = groups.reduce((sum, group) => sum + group.group.length, 0);
//     const protectedRoutes = groups.reduce((sum, group) =>
//         sum + group.group.filter(route => group.middlewares && group.middlewares.length > 0).length, 0
//     );
//     const validatedRoutes = groups.reduce((sum, group) =>
//         sum + group.group.filter(route => route.validator).length, 0
//     );

//     document.getElementById('groupCount').textContent = groups.length;
//     document.getElementById('endpointCount').textContent = totalEndpoints;
//     document.getElementById('protectedCount').textContent = protectedRoutes;
//     document.getElementById('validatedCount').textContent = validatedRoutes;
// }

// Event handlers
// function filterByMethod(method) {
//     currentFilter = method;

//     // Update active button
//     document.querySelectorAll('.filter-btn').forEach(btn => {
//         btn.classList.remove('active', 'bg-primary-500', 'text-white');
//         btn.classList.add('bg-white', 'dark:bg-gray-800', 'text-gray-700', 'dark:text-gray-300');
//     });
//     event.target.classList.add('active', 'bg-primary-500', 'text-white');
//     event.target.classList.remove('bg-white', 'dark:bg-gray-800', 'text-gray-700', 'dark:text-gray-300');

//     renderDocumentation();
// }

function filterByType(type) {
    currentRouteType = type;

    // Update active button
    updateActiveFilterButton(type);

    renderDocumentation();
}

function updateActiveFilterButton(activeType) {
    // Remove active classes from all filter buttons
    document.querySelectorAll('.filter-btn').forEach((btn) => {
        btn.classList.remove('active', 'bg-primary-500', 'text-white');
        btn.classList.add(
            'bg-white',
            'dark:bg-gray-800',
            'text-gray-700',
            'dark:text-gray-300',
            'border',
            'border-gray-300',
            'dark:border-gray-600',
        );
    });

    // Add active classes to the selected button
    const activeButton = document.querySelector(
        `button[onclick="filterByType('${activeType}')"]`,
    );
    if (activeButton) {
        activeButton.classList.add('active', 'bg-primary-500', 'text-white');
        activeButton.classList.remove(
            'bg-white',
            'dark:bg-gray-800',
            'text-gray-700',
            'dark:text-gray-300',
            'border',
            'border-gray-300',
            'dark:border-gray-600',
        );
    }
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        renderDocumentation();
    });
}

function toggleRoute(routeId) {
    const detailsElement = document.getElementById(`details-${routeId}`);
    const expandIcon =
        detailsElement.parentElement.querySelector('.expand-icon');

    if (detailsElement.classList.contains('expanded')) {
        detailsElement.classList.remove('expanded');
        expandIcon.classList.remove('rotated');
    } else {
        detailsElement.classList.add('expanded');
        expandIcon.classList.add('rotated');
    }
}

function expandAll() {
    const allDetails = document.querySelectorAll('.route-details');
    const allIcons = document.querySelectorAll('.expand-icon');

    allDetails.forEach((detail) => detail.classList.add('expanded'));
    allIcons.forEach((icon) => icon.classList.add('rotated'));
}

function collapseAll() {
    const allDetails = document.querySelectorAll('.route-details');
    const allIcons = document.querySelectorAll('.expand-icon');

    allDetails.forEach((detail) => detail.classList.remove('expanded'));
    allIcons.forEach((icon) => icon.classList.remove('rotated'));

    // Also close all test forms
    closeAllTestForms();
}

// Theme management functions
function initializeTheme() {
    // Check for saved theme in localStorage or default to light theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.classList.contains('dark')
        ? 'dark'
        : 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

function setupThemeToggle() {
    const themeToggleButton = document.getElementById('themeToggle');
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', toggleTheme);
    }
}

// Helper functions for test form
function getDefaultRequestBody(validator) {
    // If there's a validator, try to create a sample JSON based on schema
    if (validator && validationSchemas[validator]) {
        const schema = validationSchemas[validator];
        const defaultBody = {};

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
                                : `sample_${fieldName}`;
                        break;
                    case 'number':
                        defaultBody[fieldName] = fieldName.includes('id')
                            ? 1
                            : fieldName.includes('age')
                              ? 25
                              : fieldName.includes('price')
                                ? 99.99
                                : 123;
                        break;
                    case 'boolean':
                        defaultBody[fieldName] = true;
                        break;
                    default:
                        defaultBody[fieldName] = `sample_${fieldName}`;
                }
            }
        });

        return Object.keys(defaultBody).length > 0
            ? JSON.stringify(defaultBody, null, 2)
            : '{\n  "key": "value"\n}';
    }

    return '{\n  "key": "value"\n}';
}

function validateJSON(jsonString, element, errorElementId) {
    if (!jsonString.trim()) {
        element.classList.remove('json-invalid', 'json-valid');
        hideJSONError(errorElementId);
        return null;
    }

    try {
        const parsed = JSON.parse(jsonString);
        element.classList.remove('json-invalid');
        element.classList.add('json-valid');
        hideJSONError(errorElementId);
        return parsed;
    } catch (error) {
        element.classList.remove('json-valid');
        element.classList.add('json-invalid');
        showJSONError(errorElementId, error.message);
        return false;
    }
}

function showJSONError(errorElementId, message) {
    let errorElement = document.getElementById(errorElementId);
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = errorElementId;
        errorElement.className = 'json-error-message';

        const targetElement = document.querySelector(
            `[data-error-target="${errorElementId}"]`,
        );
        if (targetElement) {
            targetElement.parentNode.insertBefore(
                errorElement,
                targetElement.nextSibling,
            );
        }
    }
    errorElement.textContent = `JSON Error: ${message}`;
    errorElement.style.display = 'block';
}

function hideJSONError(errorElementId) {
    const errorElement = document.getElementById(errorElementId);
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

function setupJSONValidation(routeId) {
    const headersField = document.querySelector(
        `form[data-route-id="${routeId}"] textarea[name="headers"]`,
    );
    const bodyField = document.querySelector(
        `form[data-route-id="${routeId}"] textarea[name="body"]`,
    );

    if (headersField) {
        headersField.addEventListener('input', (e) => {
            validateJSON(e.target.value, e.target, `headers-error-${routeId}`);
        });

        // Initial validation
        validateJSON(
            headersField.value,
            headersField,
            `headers-error-${routeId}`,
        );
    }

    if (bodyField) {
        bodyField.addEventListener('input', (e) => {
            validateJSON(e.target.value, e.target, `body-error-${routeId}`);
        });

        // Initial validation
        validateJSON(bodyField.value, bodyField, `body-error-${routeId}`);
    }
}

// Test form functionality
function toggleTestForm(routeId) {
    const testForm = document.getElementById(`test-form-${routeId}`);
    const detailsElement = document.getElementById(`details-${routeId}`);
    const isCurrentlyVisible = testForm.style.display !== 'none';

    // Close all other test forms first
    closeAllTestForms(routeId);

    if (!isCurrentlyVisible) {
        // Show test form
        testForm.style.display = 'block';
        // Also expand the details if they're not expanded
        if (!detailsElement.classList.contains('expanded')) {
            detailsElement.classList.add('expanded');
            const expandIcon =
                detailsElement.parentElement.querySelector('.expand-icon');
            if (expandIcon) {
                expandIcon.classList.add('rotated');
            }
        }

        // Setup JSON validation after form is visible
        setTimeout(() => {
            setupJSONValidation(routeId);
        }, 100);
    } else {
        // If it was already visible, just hide it (since closeAllTestForms already closed it)
        testForm.style.display = 'none';
    }
}

// Helper function to close all test forms except the specified one
function closeAllTestForms(exceptRouteId = null) {
    // Find all test form sections
    const allTestForms = document.querySelectorAll('[id^="test-form-"]');
    const allTestResults = document.querySelectorAll('[id^="test-result-"]');

    allTestForms.forEach((form) => {
        const formId = form.id;
        const routeId = formId.replace('test-form-', '');

        // Skip the current form if specified
        if (exceptRouteId && routeId === exceptRouteId) {
            return;
        }

        // Hide the form
        form.style.display = 'none';

        // Also hide any results
        const resultElement = document.getElementById(`test-result-${routeId}`);
        if (resultElement) {
            resultElement.style.display = 'none';
        }

        // Clear any JSON validation errors
        const headersError = document.getElementById(
            `headers-error-${routeId}`,
        );
        const bodyError = document.getElementById(`body-error-${routeId}`);
        if (headersError) headersError.style.display = 'none';
        if (bodyError) bodyError.style.display = 'none';

        // Remove validation classes from textareas
        const headersField = document.querySelector(
            `form[data-route-id="${routeId}"] textarea[name="headers"]`,
        );
        const bodyField = document.querySelector(
            `form[data-route-id="${routeId}"] textarea[name="body"]`,
        );
        if (headersField) {
            headersField.classList.remove('json-valid', 'json-invalid');
        }
        if (bodyField) {
            bodyField.classList.remove('json-valid', 'json-invalid');
        }
    });
}

async function sendTestRequest(event, routeId, method, url, validator) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    // Get request count
    const requestCount = parseInt(formData.get('requestCount') || '1');
    if (requestCount < 1 || requestCount > 1000) {
        displayTestResult(routeId, {
            error: true,
            message: 'Request count must be between 1 and 1000',
            details: `Current value: ${requestCount}`,
        });
        return;
    }

    // Build the URL with parameters
    let finalUrl = url;
    const params = {};
    for (let [key, value] of formData.entries()) {
        if (key.startsWith('param-') && value.trim()) {
            const paramName = key.replace('param-', '');
            finalUrl = finalUrl.replace(`:${paramName}`, value);
            params[paramName] = value;
        }
    }

    // Validate and parse headers
    const headersField = form.querySelector('textarea[name="headers"]');
    const headersText = formData.get('headers');
    let headers = {
        'Content-Type': 'application/json',
    };

    if (headersText && headersText.trim()) {
        const validatedHeaders = validateJSON(
            headersText,
            headersField,
            `headers-error-${routeId}`,
        );
        if (validatedHeaders === false) {
            // JSON is invalid, don't send request
            headersField.focus();
            return;
        } else if (validatedHeaders !== null) {
            headers = { ...headers, ...validatedHeaders };
        }
    }

    // Validate and parse request body for POST/PUT/PATCH
    let body = null;
    const bodyField = form.querySelector('textarea[name="body"]');
    const bodyText = formData.get('body');

    if (
        ['POST', 'PUT', 'PATCH'].includes(method) &&
        bodyText &&
        bodyText.trim()
    ) {
        const validatedBody = validateJSON(
            bodyText,
            bodyField,
            `body-error-${routeId}`,
        );
        if (validatedBody === false) {
            // JSON is invalid, don't send request
            bodyField.focus();
            return;
        } else if (validatedBody !== null) {
            body = validatedBody;
        }
    }

    // Show loading state
    displayTestResult(routeId, {
        loading: true,
        requestCount: requestCount,
    });

    // Build fetch options
    const fetchOptions = {
        method: method,
        headers: headers,
    };

    if (body !== null) {
        fetchOptions.body = JSON.stringify(body);
    }

    try {
        const overallStartTime = Date.now();
        const results = [];
        const responseTimes = [];

        // Execute all requests
        for (let i = 0; i < requestCount; i++) {
            const startTime = Date.now();

            try {
                const response = await fetch(finalUrl, fetchOptions);
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                responseTimes.push(responseTime);

                let responseData;
                const contentType = response.headers.get('content-type');

                if (contentType && contentType.includes('application/json')) {
                    responseData = await response.json();
                } else {
                    responseData = await response.text();
                }

                results.push({
                    success: response.ok,
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries()),
                    data: responseData,
                    responseTime: responseTime,
                    requestNumber: i + 1,
                });
            } catch (requestError) {
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                responseTimes.push(responseTime);

                results.push({
                    success: false,
                    status: 0,
                    statusText: 'Network Error',
                    headers: {},
                    data: requestError.message,
                    responseTime: responseTime,
                    requestNumber: i + 1,
                    error: true,
                });
            }

            // Update progress for multiple requests
            if (requestCount > 1) {
                displayTestResult(routeId, {
                    loading: true,
                    requestCount: requestCount,
                    progress: i + 1,
                });
            }
        }

        const overallEndTime = Date.now();
        const totalTime = overallEndTime - overallStartTime;

        // Calculate statistics
        const successfulRequests = results.filter((r) => r.success).length;
        const failedRequests = results.length - successfulRequests;
        const avgResponseTime =
            responseTimes.reduce((sum, time) => sum + time, 0) /
            responseTimes.length;
        const minResponseTime = Math.min(...responseTimes);
        const maxResponseTime = Math.max(...responseTimes);

        // Display the result with statistics
        if (requestCount === 1) {
            // For single request, pass data directly
            const singleResult = results[0];
            displayTestResult(routeId, {
                success: singleResult.success,
                status: singleResult.status,
                statusText: singleResult.statusText,
                headers: singleResult.headers,
                data: singleResult.data,
                responseTime: singleResult.responseTime,
                url: finalUrl,
                method: method,
                requestHeaders: headers,
                requestBody: body,
            });
        } else {
            // For multiple requests, use the complex structure
            displayTestResult(routeId, {
                success: successfulRequests > 0,
                firstResult: results[0], // First request result for detailed display
                statistics: {
                    totalRequests: requestCount,
                    successfulRequests: successfulRequests,
                    failedRequests: failedRequests,
                    totalTime: totalTime,
                    avgResponseTime: Math.round(avgResponseTime),
                    minResponseTime: minResponseTime,
                    maxResponseTime: maxResponseTime,
                },
                url: finalUrl,
                method: method,
                requestHeaders: headers,
                requestBody: body,
                allResults: results,
            });
        }
    } catch (error) {
        displayTestResult(routeId, {
            error: true,
            message: 'Network error or request failed',
            details: error.message,
            url: finalUrl,
            method: method,
        });
    }
}

function displayTestResult(routeId, result) {
    const resultContainer = document.getElementById(`test-result-${routeId}`);
    const responseContainer = document.getElementById(
        `test-response-${routeId}`,
    );

    if (result.loading) {
        resultContainer.style.display = 'block';
        const progressText =
            result.requestCount > 1
                ? `Sending ${result.progress || 0}/${result.requestCount} requests...`
                : 'Sending request...';

        const progressBar =
            result.requestCount > 1 && result.progress
                ? `<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                 <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: ${(result.progress / result.requestCount) * 100}%"></div>
               </div>`
                : '';

        responseContainer.innerHTML = `
            <div class="flex flex-col gap-3 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span class="text-blue-800 dark:text-blue-200">${progressText}</span>
                </div>
                ${progressBar}
            </div>
        `;
        return;
    }

    if (result.error) {
        resultContainer.style.display = 'block';
        responseContainer.innerHTML = `
            <div class="p-4 bg-red-50 dark:bg-red-900 rounded-lg border border-red-200 dark:border-red-800">
                <div class="flex items-center gap-2 mb-2">
                    <svg class="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <h6 class="font-semibold text-red-800 dark:text-red-200">Error</h6>
                </div>
                <p class="text-red-700 dark:text-red-300 text-sm mb-2">${result.message}</p>
                ${result.details ? `<p class="text-red-600 dark:text-red-400 text-xs font-mono">${result.details}</p>` : ''}
                ${result.url ? `<p class="text-gray-600 dark:text-gray-400 text-xs mt-2">${result.method} ${result.url}</p>` : ''}
            </div>
        `;
        return;
    }

    // Success response - handle both single and multiple requests
    resultContainer.style.display = 'block';

    const isMultipleRequests =
        result.statistics && result.statistics.totalRequests > 1;
    const displayResult = isMultipleRequests ? result.firstResult : result;

    // Ensure displayResult has proper structure for single requests
    const safeResult = {
        status:
            displayResult.status !== undefined
                ? displayResult.status
                : 'Unknown',
        statusText: displayResult.statusText || 'Unknown',
        data:
            displayResult.data !== undefined
                ? displayResult.data
                : 'No response data',
        headers: displayResult.headers || {},
        responseTime: displayResult.responseTime || 0,
    };

    const statusColor = result.success ? 'green' : 'red';
    const statusBgColor = result.success
        ? 'bg-green-50 dark:bg-green-900'
        : 'bg-red-50 dark:bg-red-900';
    const statusTextColor = result.success
        ? 'text-green-800 dark:text-green-200'
        : 'text-red-800 dark:text-red-200';
    const statusBorderColor = result.success
        ? 'border-green-200 dark:border-green-800'
        : 'border-red-200 dark:border-red-800';

    const statisticsSection = isMultipleRequests
        ? `
        <!-- Load Test Statistics -->
        <div class="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 rounded-lg border border-blue-200 dark:border-blue-800">
            <h6 class="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
                Load Test Results
            </h6>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div class="text-center">
                    <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">${result.statistics.totalRequests}</div>
                    <div class="text-gray-600 dark:text-gray-400">Total Requests</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-green-600 dark:text-green-400">${result.statistics.successfulRequests}</div>
                    <div class="text-gray-600 dark:text-gray-400">Successful</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-red-600 dark:text-red-400">${result.statistics.failedRequests}</div>
                    <div class="text-gray-600 dark:text-gray-400">Failed</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">${result.statistics.totalTime}ms</div>
                    <div class="text-gray-600 dark:text-gray-400">Total Time</div>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-blue-200 dark:border-blue-700 text-sm">
                <div class="text-center">
                    <div class="text-lg font-semibold text-orange-600 dark:text-orange-400">${result.statistics.avgResponseTime}ms</div>
                    <div class="text-gray-600 dark:text-gray-400">Average Response Time</div>
                </div>
                <div class="text-center">
                    <div class="text-lg font-semibold text-green-600 dark:text-green-400">${result.statistics.minResponseTime}ms</div>
                    <div class="text-gray-600 dark:text-gray-400">Min Response Time</div>
                </div>
                <div class="text-center">
                    <div class="text-lg font-semibold text-red-600 dark:text-red-400">${result.statistics.maxResponseTime}ms</div>
                    <div class="text-gray-600 dark:text-gray-400">Max Response Time</div>
                </div>
            </div>
        </div>
    `
        : '';

    responseContainer.innerHTML = `
        <div class="space-y-4">
            ${statisticsSection}

            <!-- Status Info (First Request Result) -->
            <div class="flex flex-wrap items-center gap-4 p-3 ${statusBgColor} rounded-lg border ${statusBorderColor}">
                <div class="flex items-center gap-2">
                    <svg class="h-5 w-5 text-${statusColor}-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        ${
                            result.success
                                ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>'
                                : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
                        }
                    </svg>
                    <span class="font-semibold ${statusTextColor}">${safeResult.status} ${safeResult.statusText}</span>
                    ${isMultipleRequests ? '<span class="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded ml-2">First Request</span>' : ''}
                </div>
                <span class="text-sm text-gray-600 dark:text-gray-400">
                    ${safeResult.responseTime}ms • ${result.method} ${result.url}
                </span>
            </div>

            <!-- Request Details -->
            <details class="bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-600">
                <summary class="p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Request Details
                </summary>
                <div class="px-3 pb-3 space-y-2">
                    <div>
                        <h6 class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Request Headers</h6>
                        <pre class="text-xs bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-2 rounded border dark:border-gray-600 overflow-x-auto"><code>${JSON.stringify(result.requestHeaders, null, 2)}</code></pre>
                    </div>
                    ${
                        result.requestBody
                            ? `
                        <div>
                            <h6 class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Request Body</h6>
                            <pre class="text-xs bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-2 rounded border dark:border-gray-600 overflow-x-auto"><code>${JSON.stringify(result.requestBody, null, 2)}</code></pre>
                        </div>
                    `
                            : ''
                    }
                </div>
            </details>

            <!-- Response Headers -->
            <details class="bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-600">
                <summary class="p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Response Headers${isMultipleRequests ? ' (First Request)' : ''}
                </summary>
                <div class="px-3 pb-3">
                    <pre class="text-xs bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-2 rounded border dark:border-gray-600 overflow-x-auto"><code>${JSON.stringify(safeResult.headers, null, 2)}</code></pre>
                </div>
            </details>

            <!-- Response Body -->
            <div>
                <h6 class="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    Response Body${isMultipleRequests ? ' (First Request)' : ''}
                    ${
                        isMultipleRequests
                            ? `
                        <span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                            Showing 1 of ${result.statistics.totalRequests}
                        </span>
                    `
                            : ''
                    }
                </h6>
                <pre class="text-sm bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-3 rounded border dark:border-gray-600 overflow-x-auto max-h-96 overflow-y-auto"><code>${typeof safeResult.data === 'string' ? safeResult.data : JSON.stringify(safeResult.data, null, 2)}</code></pre>
            </div>
        </div>
    `;
}

function clearTestResult(routeId) {
    const resultContainer = document.getElementById(`test-result-${routeId}`);
    resultContainer.style.display = 'none';
}

// API functions
async function fetchRouteData() {
    try {
        const response = await fetch('/api/doc/routes');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('API Documentation Data:', { data });

        // Set both HTTP and WebSocket routes, validation schemas, and response types
        httpRouteGroups = data.httpRoutes || [];
        wsRouteGroups = data.wsRoutes || [];
        validationSchemas = data.validationSchemas || {};
        responseTypes = data.responseTypes || {};
        handlerTypeMapping = data.handlerTypeMapping || {};

        // Debug logging for response types
        console.log('Response Types:', responseTypes);
        console.log('Handler Type Mapping:', handlerTypeMapping);

        // Log available type names
        console.log(
            'Available response type names:',
            Object.keys(responseTypes),
        );
        console.log(
            'Available handler names in mapping:',
            Object.keys(handlerTypeMapping),
        );

        return {
            httpRoutes: httpRouteGroups,
            wsRoutes: wsRouteGroups,
            validationSchemas,
            responseTypes,
            handlerTypeMapping,
        };
    } catch (error) {
        console.error('Error fetching route data:', error);
        console.log('Calling showError function...');
        showError('Failed to load API documentation. Please refresh the page.');
        return { httpRoutes: [], wsRoutes: [] };
    }
}

function showError(message) {
    console.log('showError called with message:', message);
    const apiGroupsContainer = document.getElementById('apiGroups');
    console.log('apiGroupsContainer found:', !!apiGroupsContainer);
    if (apiGroupsContainer) {
        console.log('Setting error HTML...');
        apiGroupsContainer.innerHTML = `
            <div class="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
                <div class="text-red-800 dark:text-red-200">
                    <svg class="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <h3 class="text-lg font-semibold mb-2">Error Loading Documentation</h3>
                    <p class="text-sm">${message}</p>
                    <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                        Refresh Page
                    </button>
                </div>
            </div>
        `;
    } else {
        console.error('apiGroups container not found in DOM');
        // Fallback: create error message in body if container not found
        document.body.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div class="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center max-w-md">
                    <div class="text-red-800 dark:text-red-200">
                        <h3 class="text-lg font-semibold mb-2">Error Loading Documentation</h3>
                        <p class="text-sm">${message}</p>
                        <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                            Refresh Page
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

function showLoading() {
    const apiGroupsContainer = document.getElementById('apiGroups');
    if (apiGroupsContainer) {
        apiGroupsContainer.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p class="text-gray-600 dark:text-gray-400">Loading API documentation...</p>
            </div>
        `;
    }
}

// Initialize the documentation
document.addEventListener('DOMContentLoaded', async () => {
    initializeTheme();
    setupThemeToggle();
    setupSearch();

    // Show loading state
    showLoading();

    // Fetch route data from API
    await fetchRouteData();

    // Initialize with HTTP routes by default
    updateActiveFilterButton('http');

    // Render documentation with fetched data
    renderDocumentation();
});
