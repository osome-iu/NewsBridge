
<div style="text-align: center; margin: 20px 0;">
  <img src="https://raw.githubusercontent.com/osome-iu/NewsBridge/refs/heads/main/chrome_extension/images/news_bridge.png" 
       alt="News Bridge Logo" 
       style="width: 100px; height: auto;">
</div>

# News Bridge - LLM Facebook browser extension

<h3>Transform your Facebook experience with Facebook News Bridge!</h3> 

<p>This innovative AI browser extension utilizes a retrieval-augmented large language model (LLM) to identify low-credibility posts on Facebook and generate thoughtful responses aimed at bridging political divides. By referencing a reliable news database updated every two hours, the extension ensures your replies are informed and relevant.</p>

<h4>Key Features:</h4>
<ul>
  <li>Credibility Detection: Automatically highlights posts with low credibility.</li>
  <li>Informed Responses: Generate responses based on the latest news and data to foster meaningful conversations.
  <li>Reliable Sources: Continuously updated news database every two hours to ensure accuracy.</li>
</ul>
<h4>Important Usage Notes:</h4>
<ol>
<li>Beta Version: This extension is currently in development and is being continuously improved.</li>
<li>Verification Required: Large Language Models (LLMs) can occasionally produce errors. Always verify critical information before sharing.</li>
</ol>  
<h4>LLM Details:</h4>
<ul>
  <li>
    <strong>Current Model:</strong> The extension currently uses OpenAI’s 
    <a href="https://platform.openai.com/docs/guides/tools-web-search?api-mode=chat" target="_blank" rel="noopener noreferrer">Web Search endpoint</a> and <a href="https://platform.openai.com/docs/models/gpt-4.1" target="_blank" rel="noopener noreferrer">GPT-4.1 model</a> for comment generation. 
    Users need to input their own OpenAI API keys, to generate the responses. 
  </li>
  <li>
    <strong>Future Plans:</strong> We are actively working on integrating other OpenAI models and open-source alternatives as funding allows.
  </li>
</ul>
<h4>Middleware</h4>
<ol>
  <li>Currently the middleware is used for only the store the response from users.</li>
</ol>

<h3>Where the data is stored?</h3>
<p>The data is stored in a google excel sheet, It with the osome.developer@gmail.com.</p>

<h3>What Facebook HTML elements used to extract the posts</h3>
<p>Please refer <a href="https://docs.google.com/document/d/1Z5RAhHT91-bP2gjqXzTd0DkFQsABng1RH5gSoZ9TuQA/edit?usp=sharing" target="_blank" rel="noopener noreferrer">here</a> to update the platformConfig.js if there is change happened to Facebook HTML elements. </p>







