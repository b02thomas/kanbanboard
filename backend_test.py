import requests
import sys
import json
from datetime import datetime, timedelta

class KanbanAPITester:
    def __init__(self, base_url="https://21906602-ee50-488a-8763-9a51cc01291a.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_task_ids = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if method == 'POST' and 'id' in response_data:
                        self.created_task_ids.append(response_data['id'])
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_get_tasks_empty(self):
        """Test GET /api/tasks when no tasks exist"""
        success, response = self.run_test(
            "Get Tasks (Empty)",
            "GET",
            "tasks",
            200
        )
        if success:
            print(f"   Found {len(response)} tasks")
        return success

    def test_create_task_basic(self):
        """Test POST /api/tasks with basic task"""
        task_data = {
            "title": "Test Task 1",
            "description": "This is a test task",
            "priority": "medium",
            "project": "Test Project",
            "category": "Development",
            "assigned_to": "user1"
        }
        
        success, response = self.run_test(
            "Create Basic Task",
            "POST",
            "tasks",
            200,
            data=task_data
        )
        
        if success:
            print(f"   Created task with ID: {response.get('id')}")
            print(f"   Task status: {response.get('status')}")
            print(f"   Task priority: {response.get('priority')}")
        
        return success, response

    def test_create_task_with_deadline(self):
        """Test POST /api/tasks with deadline"""
        future_date = (datetime.now() + timedelta(days=7)).isoformat()
        
        task_data = {
            "title": "Test Task with Deadline",
            "description": "Task with deadline",
            "priority": "high",
            "project": "Urgent Project",
            "category": "Backend",
            "assigned_to": "user2",
            "deadline": future_date
        }
        
        success, response = self.run_test(
            "Create Task with Deadline",
            "POST",
            "tasks",
            200,
            data=task_data
        )
        
        if success:
            print(f"   Created task with deadline: {response.get('deadline')}")
        
        return success, response

    def test_create_task_different_priorities(self):
        """Test creating tasks with different priorities"""
        priorities = ["low", "medium", "high", "asap", "emergency"]
        results = []
        
        for priority in priorities:
            task_data = {
                "title": f"Test Task - {priority.upper()}",
                "description": f"Task with {priority} priority",
                "priority": priority,
                "project": "Priority Test",
                "category": "Development",
                "assigned_to": "user1"
            }
            
            success, response = self.run_test(
                f"Create Task - {priority.upper()} Priority",
                "POST",
                "tasks",
                200,
                data=task_data
            )
            results.append(success)
        
        return all(results)

    def test_get_tasks_populated(self):
        """Test GET /api/tasks after creating tasks"""
        success, response = self.run_test(
            "Get Tasks (Populated)",
            "GET",
            "tasks",
            200
        )
        
        if success:
            print(f"   Found {len(response)} tasks")
            for task in response[:3]:  # Show first 3 tasks
                print(f"   - {task.get('title')} ({task.get('status')}, {task.get('priority')})")
        
        return success, response

    def test_update_task_status(self):
        """Test PUT /api/tasks/{id} to update task status"""
        if not self.created_task_ids:
            print("❌ No tasks available for update test")
            return False
        
        task_id = self.created_task_ids[0]
        update_data = {
            "status": "inprogress"
        }
        
        success, response = self.run_test(
            "Update Task Status",
            "PUT",
            f"tasks/{task_id}",
            200,
            data=update_data
        )
        
        if success:
            print(f"   Updated task status to: {response.get('status')}")
        
        return success

    def test_update_task_multiple_fields(self):
        """Test PUT /api/tasks/{id} to update multiple fields"""
        if len(self.created_task_ids) < 2:
            print("❌ Not enough tasks for multiple field update test")
            return False
        
        task_id = self.created_task_ids[1]
        update_data = {
            "status": "testing",
            "priority": "asap",
            "title": "Updated Task Title",
            "description": "Updated description"
        }
        
        success, response = self.run_test(
            "Update Multiple Task Fields",
            "PUT",
            f"tasks/{task_id}",
            200,
            data=update_data
        )
        
        if success:
            print(f"   Updated task - Status: {response.get('status')}, Priority: {response.get('priority')}")
        
        return success

    def test_update_nonexistent_task(self):
        """Test PUT /api/tasks/{id} with non-existent task ID"""
        fake_id = "non-existent-task-id"
        update_data = {
            "status": "completed"
        }
        
        success, response = self.run_test(
            "Update Non-existent Task",
            "PUT",
            f"tasks/{fake_id}",
            404,
            data=update_data
        )
        
        return success

    def test_delete_task(self):
        """Test DELETE /api/tasks/{id}"""
        if not self.created_task_ids:
            print("❌ No tasks available for delete test")
            return False
        
        task_id = self.created_task_ids[-1]  # Delete the last created task
        
        success, response = self.run_test(
            "Delete Task",
            "DELETE",
            f"tasks/{task_id}",
            200
        )
        
        if success:
            self.created_task_ids.remove(task_id)
            print(f"   Deleted task with ID: {task_id}")
        
        return success

    def test_delete_nonexistent_task(self):
        """Test DELETE /api/tasks/{id} with non-existent task ID"""
        fake_id = "non-existent-task-id"
        
        success, response = self.run_test(
            "Delete Non-existent Task",
            "DELETE",
            f"tasks/{fake_id}",
            404
        )
        
        return success

    def test_create_task_missing_required_field(self):
        """Test POST /api/tasks with missing required field"""
        task_data = {
            "description": "Task without title",
            "priority": "medium"
        }
        
        success, response = self.run_test(
            "Create Task - Missing Title",
            "POST",
            "tasks",
            422,  # Validation error
            data=task_data
        )
        
        return success

    def test_task_status_workflow(self):
        """Test complete task workflow: create -> move through statuses -> complete"""
        print(f"\n🔄 Testing Complete Task Workflow...")
        
        # Create task
        task_data = {
            "title": "Workflow Test Task",
            "description": "Testing complete workflow",
            "priority": "medium",
            "project": "Workflow Test",
            "category": "Development",
            "assigned_to": "user1"
        }
        
        success, task = self.run_test(
            "Workflow - Create Task",
            "POST",
            "tasks",
            200,
            data=task_data
        )
        
        if not success:
            return False
        
        task_id = task['id']
        statuses = ["inprogress", "testing", "completed"]
        
        for status in statuses:
            success, updated_task = self.run_test(
                f"Workflow - Move to {status.upper()}",
                "PUT",
                f"tasks/{task_id}",
                200,
                data={"status": status}
            )
            
            if not success:
                return False
            
            print(f"   Task moved to: {updated_task.get('status')}")
        
        return True

def main():
    print("🚀 Starting Kanban Board API Tests")
    print("=" * 50)
    
    tester = KanbanAPITester()
    
    # Test sequence
    test_results = []
    
    # Basic CRUD tests
    test_results.append(tester.test_get_tasks_empty())
    test_results.append(tester.test_create_task_basic()[0])
    test_results.append(tester.test_create_task_with_deadline()[0])
    test_results.append(tester.test_create_task_different_priorities())
    
    # Get populated tasks
    test_results.append(tester.test_get_tasks_populated()[0])
    
    # Update tests
    test_results.append(tester.test_update_task_status())
    test_results.append(tester.test_update_task_multiple_fields())
    test_results.append(tester.test_update_nonexistent_task())
    
    # Delete tests
    test_results.append(tester.test_delete_task())
    test_results.append(tester.test_delete_nonexistent_task())
    
    # Error handling tests
    test_results.append(tester.test_create_task_missing_required_field())
    
    # Workflow test
    test_results.append(tester.test_task_status_workflow())
    
    # Print final results
    print(f"\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())