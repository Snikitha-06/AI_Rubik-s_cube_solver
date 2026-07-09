import unittest
import cube_solver

class TestSolverValidation(unittest.TestCase):

    def test_solved_cube(self):
        # Create solved state
        state = cube_solver.create_solved_state(3)
        # Solve should return empty list for solved state
        solution = cube_solver.solve(state, 3)
        self.assertEqual(solution, [])
        # State validation should pass
        valid, msg, _ = cube_solver.validate_state(state)
        self.assertTrue(valid)
        self.assertEqual(msg, "Valid")

    def test_twisted_corner(self):
        # Solved cube but twist one corner: U9 gets R, R1 gets F, F3 gets U
        state = cube_solver.create_solved_state(3)
        state['U'][8] = 'red'
        state['R'][0] = 'green'
        state['F'][2] = 'white'
        
        # Color counts are still exactly 9 of each color, so validate_state will pass
        valid, msg, _ = cube_solver.validate_state(state)
        self.assertTrue(valid)
        
        # But solving should raise ValueError with "Twist error"
        with self.assertRaises(ValueError) as context:
            cube_solver.solve(state, 3)
        self.assertIn("Twist error", str(context.exception))

    def test_flipped_edge(self):
        # Solved cube but flip one edge: U8 gets F, F2 gets U
        state = cube_solver.create_solved_state(3)
        state['U'][7] = 'green'
        state['F'][1] = 'white'
        
        # Color counts are valid
        valid, msg, _ = cube_solver.validate_state(state)
        self.assertTrue(valid)
        
        # But solving should raise ValueError with "Flip error"
        with self.assertRaises(ValueError) as context:
            cube_solver.solve(state, 3)
        self.assertIn("Flip error", str(context.exception))

    def test_invalid_centers_chirality(self):
        # Solved cube but swap Right and Left center colors (red and orange)
        state = cube_solver.create_solved_state(3)
        state['R'][4] = 'orange'
        state['L'][4] = 'red'
        
        # Validation should fail because center colors form a left-handed coordinate system
        valid, msg, _ = cube_solver.validate_state(state)
        self.assertFalse(valid)
        self.assertIn("mirrored", msg)

    def test_invalid_centers_uniqueness(self):
        # Set U center and D center to same color (white)
        # To keep counts at exactly 9 each, we swap D center with some white sticker
        state = cube_solver.create_solved_state(3)
        state['D'][4] = 'white'
        state['U'][0] = 'yellow'
        
        # Validation should fail
        valid, msg, _ = cube_solver.validate_state(state)
        self.assertFalse(valid)
        self.assertIn("must have unique colors", msg)

if __name__ == '__main__':
    unittest.main()
