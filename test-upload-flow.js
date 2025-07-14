const FormData = require('form-data');
const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testImageUploadAndPostCreation() {
  try {
    console.log('🔄 Starting image upload test...');
    
    // Step 1: Upload image
    const formData = new FormData();
    const imagePath = '/Users/avinashgantala/Development/Infinity_Angles/backend_new/uploads/1752481579068-223069793-87f4cb3f-2799-46fe-8715-6eabb90da86e.png';
    
    formData.append('image', fs.createReadStream(imagePath));
    formData.append('originalName', 'test.png');
    
    const uploadResponse = await fetch('http://192.168.1.7:3000/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    const uploadResult = await uploadResponse.json();
    console.log('📤 Upload result:', uploadResult);
    
    if (!uploadResult.success) {
      throw new Error('Image upload failed');
    }
    
    const imageUrl = uploadResult.data.url;
    console.log('✅ Image uploaded successfully:', imageUrl);
    
    // Step 2: Create post with image
    const postData = {
      title: 'Test Post with Uploaded Image',
      content: 'This post was created with an uploaded image to test the flow',
      images: [imageUrl], // Array of image URLs
      tags: ['test', 'upload', 'image'],
    };
    
    console.log('🔄 Creating post with data:', postData);
    
    const postResponse = await fetch('http://192.168.1.7:3000/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: For testing, we'll skip authentication for now
      },
      body: JSON.stringify(postData),
    });
    
    const postResult = await postResponse.json();
    console.log('📝 Post creation result:', postResult);
    
    if (postResult.success) {
      console.log('✅ Post created successfully with image!');
      console.log('Post ID:', postResult.data._id);
      console.log('Image URLs in post:', postResult.data.images);
    } else {
      console.log('❌ Post creation failed:', postResult.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testImageUploadAndPostCreation();
