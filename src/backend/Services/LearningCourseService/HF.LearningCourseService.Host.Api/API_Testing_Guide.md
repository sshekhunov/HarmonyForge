# LearningCourse API Testing Guide

This guide explains how to test the LearningCourse API using the provided .http files.

## Prerequisites

1. **Start the API**: Run the LearningCourseService API
   ```bash
   dotnet run --project HF.LearningCourseService.Host.Api
   ```

2. **API Endpoints**: The API will be available at:
   - HTTP: `http://localhost:5085`
   - HTTPS: `https://localhost:7064`

## Testing Files

### 1. `LearningCourses.http` - Comprehensive Testing
This file contains extensive test cases covering:
- Basic CRUD operations
- Complex course creation with modules and items
- Error scenarios
- Performance testing
- Different module item types (Article, Exercise, Test)

### 2. `QuickTest.http` - Quick Testing
This file contains simplified test cases for:
- Basic functionality verification
- Quick smoke tests
- Essential CRUD operations

## How to Use

### Using Visual Studio Code
1. Install the "REST Client" extension
2. Open any .http file
3. Click "Send Request" above each request
4. View responses in the output panel

### Using JetBrains Rider
1. Open any .http file
2. Click the green arrow next to each request
3. View responses in the HTTP Client tool window

### Using Visual Studio
1. Open any .http file
2. Right-click and select "Send Request"
3. View responses in the HTTP Client window

## Test Scenarios

### Basic Operations
1. **GET /api/learningcourses** - Retrieve all courses
2. **POST /api/learningcourses** - Create a new course
3. **GET /api/learningcourses/{id}** - Get course by ID
4. **PUT /api/learningcourses** - Update existing course
5. **DELETE /api/learningcourses/{id}** - Delete course

### Advanced Scenarios
- Creating courses with nested modules and module items
- Testing different module item types (Article, Exercise, Test)
- Error handling (invalid JSON, missing fields)
- Performance testing with large datasets

## Sample Data Structure

### Course with Modules and Items
```json
{
  "title": "Advanced C# Development",
  "description": "Comprehensive course covering advanced C# concepts",
  "modules": [
    {
      "title": "Object-Oriented Programming",
      "description": "Deep dive into OOP principles",
      "items": [
        {
          "id": "guid-here",
          "title": "Classes and Objects",
          "description": "Understanding classes and object instantiation",
          "type": "Article"
        }
      ]
    }
  ]
}
```

### Module Item Types
- **Article**: Reading material and documentation
- **Exercise**: Hands-on practice and coding exercises
- **Test**: Quizzes and knowledge assessments

## Troubleshooting

### Common Issues
1. **Connection Refused**: Ensure the API is running
2. **404 Not Found**: Check the endpoint URL and route
3. **400 Bad Request**: Verify JSON format and required fields
4. **500 Internal Server Error**: Check API logs for detailed error information

### Getting Course IDs
After creating a course, copy the ID from the response and update the `@courseId` variable in the .http files for subsequent requests.

## API Response Examples

### Successful Course Creation
```json
{
  "id": "12345678-1234-1234-1234-123456789012",
  "title": "Test Course",
  "description": "A test course",
  "modules": []
}
```

### Course with Modules
```json
{
  "id": "12345678-1234-1234-1234-123456789012",
  "title": "Advanced C# Development",
  "description": "Comprehensive course",
  "modules": [
    {
      "title": "OOP Module",
      "description": "Object-oriented programming",
      "items": [
        {
          "id": "87654321-4321-4321-4321-210987654321",
          "title": "Classes and Objects",
          "description": "Understanding classes",
          "type": "Article"
        }
      ]
    }
  ]
}
```
