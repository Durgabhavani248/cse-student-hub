// =========================================================
// CODING PROBLEM SEED DATA
// =========================================================

export const codingProblems = [
  {
    title: "Find the Largest Element in an Array",
    slug: "find-largest-element-array",
    topic: "Arrays",
    difficulty: "Easy",

    description:
      "Given an array of integers, find and return the largest element in the array.",

    inputFormat:
      "The first line contains an integer N. The second line contains N integers.",

    outputFormat:
      "Print the largest element in the array.",

    constraints:
      "1 ≤ N ≤ 100000",

    examples: [
      {
        input: "5\n10 25 7 42 18",
        output: "42",
        explanation:
          "42 is the largest value in the array."
      }
    ],

    supportedLanguages: [
      "C",
      "C++",
      "Java",
      "Python"
    ],

    marks: 10,
    timeLimit: 1,
    memoryLimit: 128,

    testCases: [
      {
        input: "5\n10 25 7 42 18",
        expectedOutput: "42"
      },
      {
        input: "4\n3 8 2 6",
        expectedOutput: "8"
      },
      {
        input: "1\n99",
        expectedOutput: "99"
      }
    ],

    active: true
  },

  {
    title: "Check Palindrome String",
    slug: "check-palindrome-string",
    topic: "Strings",
    difficulty: "Easy",

    description:
      "Given a string, determine whether it reads the same forward and backward.",

    inputFormat:
      "The input contains a single string.",

    outputFormat:
      "Print YES if the string is a palindrome; otherwise print NO.",

    constraints:
      "1 ≤ length of string ≤ 100000",

    examples: [
      {
        input: "madam",
        output: "YES",
        explanation:
          "The string remains the same when reversed."
      }
    ],

    supportedLanguages: [
      "C",
      "C++",
      "Java",
      "Python"
    ],

    marks: 10,
    timeLimit: 1,
    memoryLimit: 128,

    testCases: [
      {
        input: "madam",
        expectedOutput: "YES"
      },
      {
        input: "hello",
        expectedOutput: "NO"
      },
      {
        input: "level",
        expectedOutput: "YES"
      }
    ],

    active: true
  },

  {
    title: "Binary Search",
    slug: "binary-search",
    topic: "Searching",
    difficulty: "Medium",

    description:
      "Given a sorted array and a target value, find the index of the target using binary search.",

    inputFormat:
      "The first line contains N. The second line contains N sorted integers. The third line contains the target.",

    outputFormat:
      "Print the zero-based index of the target. Print -1 if the target is not present.",

    constraints:
      "1 ≤ N ≤ 100000",

    examples: [
      {
        input: "5\n2 4 6 8 10\n8",
        output: "3",
        explanation:
          "The target 8 is present at zero-based index 3."
      }
    ],

    supportedLanguages: [
      "C",
      "C++",
      "Java",
      "Python"
    ],

    marks: 20,
    timeLimit: 1,
    memoryLimit: 128,

    testCases: [
      {
        input: "5\n2 4 6 8 10\n8",
        expectedOutput: "3"
      },
      {
        input: "5\n2 4 6 8 10\n5",
        expectedOutput: "-1"
      },
      {
        input: "1\n7\n7",
        expectedOutput: "0"
      }
    ],

    active: true
  },

  {
    title: "Reverse a String",
    slug: "reverse-string",
    topic: "Strings",
    difficulty: "Easy",

    description:
      "Given a string, print the characters of the string in reverse order.",

    inputFormat:
      "The input contains a single string.",

    outputFormat:
      "Print the reversed string.",

    constraints:
      "1 ≤ length of string ≤ 100000",

    examples: [
      {
        input: "hello",
        output: "olleh",
        explanation:
          "The characters are printed from the last character to the first."
      }
    ],

    supportedLanguages: [
      "C",
      "C++",
      "Java",
      "Python"
    ],

    marks: 10,
    timeLimit: 1,
    memoryLimit: 128,

    testCases: [
      {
        input: "hello",
        expectedOutput: "olleh"
      },
      {
        input: "code",
        expectedOutput: "edoc"
      },
      {
        input: "A",
        expectedOutput: "A"
      }
    ],

    active: true
  },

  {
    title: "Sum of Array Elements",
    slug: "sum-array-elements",
    topic: "Arrays",
    difficulty: "Easy",

    description:
      "Given an array of integers, calculate the sum of all its elements.",

    inputFormat:
      "The first line contains N. The second line contains N integers.",

    outputFormat:
      "Print the sum of all array elements.",

    constraints:
      "1 ≤ N ≤ 100000",

    examples: [
      {
        input: "5\n1 2 3 4 5",
        output: "15",
        explanation:
          "The sum is 1 + 2 + 3 + 4 + 5 = 15."
      }
    ],

    supportedLanguages: [
      "C",
      "C++",
      "Java",
      "Python"
    ],

    marks: 10,
    timeLimit: 1,
    memoryLimit: 128,

    testCases: [
      {
        input: "5\n1 2 3 4 5",
        expectedOutput: "15"
      },
      {
        input: "4\n10 20 30 40",
        expectedOutput: "100"
      },
      {
        input: "1\n25",
        expectedOutput: "25"
      }
    ],

    active: true
  }
];