const { v4: uuidv4 } = require('uuid');

// Sample feeds data
const feeds = [
  {
    "id": "cb824d87-80b9-430c-adc9-c2f46573bb4e",
    "author": "Rama",
    "authorRole": "krishna",
    "timestamp": "now",
    "content": "Good fellow",
    "category": "Identification",
    "likes": 0,
    "comments": 0,
    "tags": [
      "Technical sounded"
    ],
    "images": [],
    "createdAt": "2025-07-04T15:50:41.873Z",
    "updatedAt": "2025-07-04T15:50:41.873Z"
  },
  {
    "id": "b001ca0f-8e0d-45d0-a355-c80dc5f797b1",
    "author": {
      "_id": "user_venkatesh_mada",
      "fullName": "Venkatesh Mada",
      "username": "venkatesh_mada",
      "avatar": "https://ui-avatars.com/api/?name=Venkatesh+Mada&background=667eea&color=fff&size=128&bold=true",
      "bio": "Magazine editor passionate about design and engineering. Helping professionals discover the best tools for their craft.",
      "location": "Bangalore, India",
      "isVerified": true,
      "followersCount": 2500,
      "followingCount": 180,
      "postsCount": 45
    },
    "authorRole": "Magazine editor",
    "timestamp": "5 min ago",
    "content": "Millions of designers, engineers, and businesses around the world trust SOLIDWORKS to provide powerful, yet easy-to-use 2D and 3D product development solutions.",
    "category": "General",
    "likes": 15,
    "comments": 3,
    "tags": [
      "solidworks",
      "design",
      "engineering"
    ],
    "images": [
      {
        "id": "d66619f9-5efa-4edf-8585-3164068a96c6",
        "url": "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&h=600&fit=crop",
        "thumbnails": {
          "small": {
            "url": "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=150&h=150&fit=crop",
            "width": 150,
            "height": 150
          },
          "medium": {
            "url": "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=400&h=400&fit=crop",
            "width": 400,
            "height": 400
          },
          "large": {
            "url": "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&h=600&fit=crop",
            "width": 800,
            "height": 600
          }
        },
        "alt": "SOLIDWORKS CAD design interface"
      }
    ],
    "createdAt": "2025-07-01T10:55:00.000Z",
    "updatedAt": "2025-07-01T10:55:00.000Z"
  },
  {
    "id": "717725d3-d5e9-4b6b-a4b8-09e5b8058ce6",
    "author": {
      "_id": "user_john_smith",
      "fullName": "John Smith",
      "username": "johnsmith_tech",
      "avatar": "https://ui-avatars.com/api/?name=John+Smith&background=4ecdc4&color=fff&size=128&bold=true",
      "bio": "Tech Lead passionate about innovation and product development. Building the future with cutting-edge technologies.",
      "location": "San Francisco, CA",
      "isVerified": false,
      "followersCount": 890,
      "followingCount": 220,
      "postsCount": 23
    },
    "authorRole": "Tech Lead",
    "timestamp": "10 min ago",
    "content": "Exploring the latest innovations in product development methodologies. The future of design is here!",
    "category": "Innovation",
    "likes": 8,
    "comments": 1,
    "tags": [
      "innovation",
      "product",
      "development"
    ],
    "images": [
      {
        "id": "45fd73ea-0148-43f9-860e-1a9bf7275318",
        "url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop",
        "thumbnails": {
          "small": {
            "url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=150&h=150&fit=crop",
            "width": 150,
            "height": 150
          },
          "medium": {
            "url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop",
            "width": 400,
            "height": 400
          },
          "large": {
            "url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop",
            "width": 800,
            "height": 600
          }
        },
        "alt": "Innovation and technology concept"
      }
    ],
    "createdAt": "2025-07-01T10:50:00.000Z",
    "updatedAt": "2025-07-01T10:50:00.000Z"
  },
  {
    "id": "e89f1ea8-3986-4dd3-994f-575351d48ece",
    "author": {
      "_id": "user_sarah_wilson",
      "fullName": "Sarah Wilson",
      "username": "sarah_research",
      "avatar": "https://ui-avatars.com/api/?name=Sarah+Wilson&background=f093fb&color=fff&size=128&bold=true",
      "bio": "Research Analyst specializing in manufacturing technology and CAD innovations. Data-driven insights for better engineering.",
      "location": "Seattle, WA",
      "isVerified": true,
      "followersCount": 1650,
      "followingCount": 95,
      "postsCount": 67
    },
    "authorRole": "Research Analyst",
    "timestamp": "15 min ago",
    "content": "New research shows significant improvements in manufacturing efficiency with modern CAD tools.",
    "category": "Research",
    "likes": 22,
    "comments": 5,
    "tags": [
      "research",
      "manufacturing",
      "cad"
    ],
    "images": [
      {
        "id": "5f64b61a-8a8e-4e92-b031-124a4f07066d",
        "url": "https://images.unsplash.com/photo-1565106430482-8f6e74349ca1?w=800&h=600&fit=crop",
        "thumbnails": {
          "small": {
            "url": "https://images.unsplash.com/photo-1565106430482-8f6e74349ca1?w=150&h=150&fit=crop",
            "width": 150,
            "height": 150
          },
          "medium": {
            "url": "https://images.unsplash.com/photo-1565106430482-8f6e74349ca1?w=400&h=400&fit=crop",
            "width": 400,
            "height": 400
          },
          "large": {
            "url": "https://images.unsplash.com/photo-1565106430482-8f6e74349ca1?w=800&h=600&fit=crop",
            "width": 800,
            "height": 600
          }
        },
        "alt": "Manufacturing research and CAD tools"
      }
    ],
    "createdAt": "2025-07-01T10:45:00.000Z",
    "updatedAt": "2025-07-01T10:45:00.000Z"
  },
  {
    "id": "e3533e23-2274-4661-a230-3cb709ec60b3",
    "author": "https://meet.google.com/rur-cmet-srt",
    "authorRole": "Application",
    "timestamp": "now",
    "content": "Omyra Technologies",
    "category": "Technology",
    "likes": 8,
    "comments": 0,
    "tags": [],
    "images": [],
    "createdAt": "2025-07-01T10:40:47.217Z",
    "updatedAt": "2025-07-01T10:47:07.118Z"
  },
  {
    "id": "2d2f2f92-53d1-4854-99c5-3dc2cc2ef404",
    "author": {
      "_id": "user_mike_johnson",
      "fullName": "Mike Johnson",
      "username": "mike_ux",
      "avatar": "https://ui-avatars.com/api/?name=Mike+Johnson&background=a8e6cf&color=333&size=128&bold=true",
      "bio": "UX Designer creating beautiful and intuitive experiences. Design thinking enthusiast and user advocate.",
      "location": "Austin, TX",
      "isVerified": false,
      "followersCount": 3200,
      "followingCount": 450,
      "postsCount": 89
    },
    "authorRole": "UX Designer",
    "timestamp": "20 min ago",
    "content": "User experience is at the heart of every successful product. Today we're diving deep into design thinking methodologies.",
    "category": "Design",
    "likes": 18,
    "comments": 7,
    "tags": [
      "ux",
      "design",
      "methodology"
    ],
    "images": [
      {
        "id": "045a2f21-6816-4b5f-a184-1142e1c6e7f5",
        "url": "https://images.unsplash.com/photo-1559028012-481c04fa702d?w=800&h=600&fit=crop",
        "thumbnails": {
          "small": {
            "url": "https://images.unsplash.com/photo-1559028012-481c04fa702d?w=150&h=150&fit=crop",
            "width": 150,
            "height": 150
          },
          "medium": {
            "url": "https://images.unsplash.com/photo-1559028012-481c04fa702d?w=400&h=400&fit=crop",
            "width": 400,
            "height": 400
          },
          "large": {
            "url": "https://images.unsplash.com/photo-1559028012-481c04fa702d?w=800&h=600&fit=crop",
            "width": 800,
            "height": 600
          }
        },
        "alt": "UX design wireframes and sketches"
      },
      {
        "id": "d3b1c883-883a-4ffd-8508-f2dbc217897e",
        "url": "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800&h=600&fit=crop",
        "thumbnails": {
          "small": {
            "url": "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=150&h=150&fit=crop",
            "width": 150,
            "height": 150
          },
          "medium": {
            "url": "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=400&h=400&fit=crop",
            "width": 400,
            "height": 400
          },
          "large": {
            "url": "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800&h=600&fit=crop",
            "width": 800,
            "height": 600
          }
        },
        "alt": "Design thinking process diagram"
      }
    ],
    "createdAt": "2025-07-01T10:40:00.000Z",
    "updatedAt": "2025-07-01T10:40:00.000Z"
  },
  {
    "id": "c5ee27ed-b72a-40bb-9a3c-641edc26fc01",
    "author": "Persistent Test User",
    "authorRole": "QA Engineer",
    "timestamp": "now",
    "content": "This is a test feed to verify persistence functionality. This feed should survive server restarts!",
    "category": "Technology",
    "likes": 1,
    "comments": 0,
    "tags": [
      "persistence",
      "test",
      "backend"
    ],
    "images": [],
    "createdAt": "2025-07-01T10:36:00.878Z",
    "updatedAt": "2025-07-01T10:47:08.188Z"
  },
  {
    "id": "6df55f07-9ad4-4644-adc1-0299b22f619f",
    "author": "Emily Chen",
    "authorRole": "Product Manager",
    "timestamp": "25 min ago",
    "content": "Agile development practices have revolutionized how we build products. Here's what we've learned after 5 years of implementation.",
    "category": "Management",
    "likes": 12,
    "comments": 2,
    "tags": [
      "agile",
      "product",
      "management"
    ],
    "images": [],
    "createdAt": "2025-07-01T10:35:00.000Z",
    "updatedAt": "2025-07-01T10:35:00.000Z"
  },
  {
    "id": "dcbb113f-27dd-4857-822a-ebaad3c66631",
    "author": "David Rodriguez",
    "authorRole": "Software Engineer",
    "timestamp": "30 min ago",
    "content": "The latest trends in software architecture are focusing on microservices and cloud-native solutions. Time to adapt!",
    "category": "Technology",
    "likes": 25,
    "comments": 9,
    "tags": [
      "microservices",
      "cloud",
      "architecture"
    ],
    "images": [
      {
        "id": "ef64dd76-1a55-4e5f-a48c-04b58ca1956f",
        "url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop",
        "thumbnails": {
          "small": {
            "url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=150&h=150&fit=crop",
            "width": 150,
            "height": 150
          },
          "medium": {
            "url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=400&fit=crop",
            "width": 400,
            "height": 400
          },
          "large": {
            "url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop",
            "width": 800,
            "height": 600
          }
        },
        "alt": "Cloud computing and microservices architecture"
      }
    ],
    "createdAt": "2025-07-01T10:30:00.000Z",
    "updatedAt": "2025-07-01T10:30:00.000Z"
  },
  {
    "id": "1e0632b1-139c-48ae-be2d-6d6fc95513da",
    "author": "Lisa Thompson",
    "authorRole": "Marketing Director",
    "timestamp": "35 min ago",
    "content": "Digital marketing strategies in 2025: AI-powered personalization is no longer optional, it's essential for customer engagement.",
    "category": "Marketing",
    "likes": 14,
    "comments": 4,
    "tags": [
      "marketing",
      "ai",
      "personalization"
    ],
    "images": [],
    "createdAt": "2025-07-01T10:25:00.000Z",
    "updatedAt": "2025-07-01T10:25:00.000Z"
  },
  {
    "id": "17390360-f9f9-4bed-822e-68113c1e9d50",
    "author": "Robert Kim",
    "authorRole": "Business Analyst",
    "timestamp": "40 min ago",
    "content": "Data-driven decision making is transforming business operations. Here's how we increased efficiency by 40% using analytics.",
    "category": "Business",
    "likes": 19,
    "comments": 6,
    "tags": [
      "analytics",
      "business",
      "efficiency"
    ],
    "images": [
      {
        "id": "86e6a143-ead2-424b-879f-a3af59e3bfcf",
        "url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop",
        "thumbnails": {
          "small": {
            "url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=150&h=150&fit=crop",
            "width": 150,
            "height": 150
          },
          "medium": {
            "url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop",
            "width": 400,
            "height": 400
          },
          "large": {
            "url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop",
            "width": 800,
            "height": 600
          }
        },
        "alt": "Business analytics dashboard and data visualization"
      }
    ],
    "createdAt": "2025-07-01T10:20:00.000Z",
    "updatedAt": "2025-07-01T10:20:00.000Z"
  }
];

module.exports = feeds;