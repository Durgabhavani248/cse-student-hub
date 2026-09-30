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

    starterCode: {
      Python: `# Input Format:
# First line: N
# Second line: N integers

n = int(input())
nums = list(map(int, input().split()))

# Write your solution below

maximum = nums[0]

for num in nums:
    if num > maximum:
        maximum = num

print(maximum)`,

      Cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    // Input Format:
    // First line: N
    // Second line: N integers

    int n;
    cin >> n;

    vector<int> nums(n);

    for (int i = 0; i < n; i++) {
        cin >> nums[i];
    }

    // Write your solution below

    int maximum = nums[0];

    for (int num : nums) {
        if (num > maximum) {
            maximum = num;
        }
    }

    cout << maximum;

    return 0;
}`,

      Java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Input Format:
        // First line: N
        // Second line: N integers

        Scanner sc = new Scanner(System.in);

        int n = sc.nextInt();
        int[] nums = new int[n];

        for (int i = 0; i < n; i++) {
            nums[i] = sc.nextInt();
        }

        // Write your solution below

        int maximum = nums[0];

        for (int num : nums) {
            if (num > maximum) {
                maximum = num;
            }
        }

        System.out.println(maximum);
    }
}`
    },

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

    starterCode: {
      Python: `# Input Format:
# A single string

s = input().strip()

# Write your solution below

if s == s[::-1]:
    print("YES")
else:
    print("NO")`,

      Cpp: `#include <iostream>
#include <string>
#include <algorithm>
using namespace std;

int main() {
    // Input Format:
    // A single string

    string s;
    cin >> s;

    // Write your solution below

    string reversed = s;
    reverse(reversed.begin(), reversed.end());

    if (s == reversed)
        cout << "YES";
    else
        cout << "NO";

    return 0;
}`,

      Java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Input Format:
        // A single string

        Scanner sc = new Scanner(System.in);

        String s = sc.next();

        // Write your solution below

        String reversed =
            new StringBuilder(s).reverse().toString();

        if (s.equals(reversed))
            System.out.print("YES");
        else
            System.out.print("NO");
    }
}`
    },

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

    starterCode: {
      Python: `# Input Format:
# First line: N
# Second line: N sorted integers
# Third line: Target

n = int(input())
nums = list(map(int, input().split()))
target = int(input())

# Write your solution below

left = 0
right = n - 1
answer = -1

while left <= right:
    mid = (left + right) // 2

    if nums[mid] == target:
        answer = mid
        break
    elif nums[mid] < target:
        left = mid + 1
    else:
        right = mid - 1

print(answer)`,

      Cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    // Input Format:
    // First line: N
    // Second line: N sorted integers
    // Third line: Target

    int n;
    cin >> n;

    vector<int> nums(n);

    for (int i = 0; i < n; i++) {
        cin >> nums[i];
    }

    int target;
    cin >> target;

    // Write your solution below

    int left = 0;
    int right = n - 1;
    int answer = -1;

    while (left <= right) {
        int mid = left + (right - left) / 2;

        if (nums[mid] == target) {
            answer = mid;
            break;
        } else if (nums[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    cout << answer;

    return 0;
}`,

      Java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Input Format:
        // First line: N
        // Second line: N sorted integers
        // Third line: Target

        Scanner sc = new Scanner(System.in);

        int n = sc.nextInt();
        int[] nums = new int[n];

        for (int i = 0; i < n; i++) {
            nums[i] = sc.nextInt();
        }

        int target = sc.nextInt();

        // Write your solution below

        int left = 0;
        int right = n - 1;
        int answer = -1;

        while (left <= right) {
            int mid = left + (right - left) / 2;

            if (nums[mid] == target) {
                answer = mid;
                break;
            } else if (nums[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }

        System.out.println(answer);
    }
}`
    },

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

    starterCode: {
      Python: `# Input Format:
# A single string

s = input().strip()

# Write your solution below

print(s[::-1])`,

      Cpp: `#include <iostream>
#include <string>
#include <algorithm>
using namespace std;

int main() {
    // Input Format:
    // A single string

    string s;
    cin >> s;

    // Write your solution below

    reverse(s.begin(), s.end());

    cout << s;

    return 0;
}`,

      Java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Input Format:
        // A single string

        Scanner sc = new Scanner(System.in);

        String s = sc.next();

        // Write your solution below

        System.out.println(
            new StringBuilder(s).reverse().toString()
        );
    }
}`
    },

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

    starterCode: {
      Python: `# Input Format:
# First line: N
# Second line: N integers

n = int(input())
nums = list(map(int, input().split()))

# Write your solution below

total = 0

for num in nums:
    total += num

print(total)`,

      Cpp: `#include <iostream>
using namespace std;

int main() {
    // Input Format:
    // First line: N
    // Second line: N integers

    int n;
    cin >> n;

    long long total = 0;

    for (int i = 0; i < n; i++) {
        int num;
        cin >> num;
        total += num;
    }

    // Write your solution below

    cout << total;

    return 0;
}`,

      Java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Input Format:
        // First line: N
        // Second line: N integers

        Scanner sc = new Scanner(System.in);

        int n = sc.nextInt();
        long total = 0;

        for (int i = 0; i < n; i++) {
            total += sc.nextInt();
        }

        // Write your solution below

        System.out.println(total);
    }
}`
    },

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