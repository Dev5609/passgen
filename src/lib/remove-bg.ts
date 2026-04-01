'use server';

export async function removeBackground(photoDataUri: string): Promise<string> {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    throw new Error('remove.bg API key is not configured.');
  }

  const imageBlob = await (await fetch(photoDataUri)).blob();
  
  const fileExtension = imageBlob.type.split('/')[1] || 'png';
  const fileName = `photo.${fileExtension}`;

  const formData = new FormData();
  formData.append('image_file', imageBlob, fileName);
  formData.append('size', 'auto');
  formData.append('bg_color', 'white');

  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`remove.bg API error: ${errorText}`);
    throw new Error(`Failed to remove background. Status: ${response.status}`);
  }

  const resultBlob = await response.blob();
  const arrayBuffer = await resultBlob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = resultBlob.type || 'image/png';
  
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}
