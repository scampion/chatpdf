const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const paramValue = urlParams.get('openaikey');

import {Md5} from 'ts-md5';

function computeMd5(text: string): string {
  return Md5.hashStr(text);
}



if (paramValue) {
   document.getElementById("openai_api_key_row").style.display = "none";
}


let map_page_text = null;


const fileloader = document.getElementById("fileloader");
fileloader?.addEventListener("change", submit);

async function submit(this: HTMLElement, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0]; // get the selected file
    if (!file) return; // do nothing if no file is selected

    const fileReader = new FileReader();
    fileReader.readAsArrayBuffer(file); // read the file as an ArrayBuffer

    // when the file is loaded, use pdfjsLib to render the PDF
    fileReader.onload = async () => {
    const pdf = await pdfjsLib.getDocument({ data: fileReader.result }).promise;
    // do something with the PDF, e.g. render it to a canvas element
        const canvas = document.getElementById("pdf") as HTMLCanvasElement;
        display_page(pdf, 1, canvas);
        searchAndHighlightText(pdf, "Consultant", canvas);
        map_page_text = await readPdfText(pdf);
        console.log(map_page_text.get(2));

    };
}

import * as pdfjsLib from "pdfjs-dist";

(async () => {
  const loadingTask = pdfjsLib.getDocument("example.pdf");
  const pdf = await loadingTask.promise;
  display_page(pdf, 1, document.getElementById("pdf") as HTMLCanvasElement);
})();

async function display_page(pdf: pdfjsLib.PDFDocumentProxy, pageNumber: number, canvas: HTMLCanvasElement) {
  const page = await pdf.getPage(pageNumber);
  const scale = 1;
  const viewport = page.getViewport({ scale });
  // Apply page dimensions to the `<canvas>` element.
  const context = canvas.getContext("2d");
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  // Render the page into the `<canvas>` element.
  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };
  await page.render(renderContext);
  console.log("Page rendered!");
}



interface TextHighlight {
  page: number;
  coords: Array<number>;
}

interface TextItem {
  str: string;
  transform: Array<any>;
  width: number;
  height: number;

}

async function searchAndHighlightText(pdf: pdfjsLib.PDFDocumentProxy, searchText: string, canvas: HTMLCanvasElement): Promise<Array<TextHighlight>> {
  const matches: Array<TextHighlight> = [];

  // loop through all the pages in the PDF
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);

    // get the text content of the page
    const content = await page.getTextContent();
    // loop through all the text items on the page
    for (const item of content.items) {
      const text = (item as TextItem).str;
      // search for the search text in the current text item
      const startIndex = text.toLowerCase().indexOf(searchText.toLowerCase());
      if (startIndex >= 0) {
        // get the dimensions of the text item on the page
        const transform = (item as TextItem).transform;
        const x = transform[4];
        const y = canvas.height - transform[5];
        //const width = (item as TextItem).width * transform[0];
        //const height = (item as TextItem).height * -transform[3];
        const width = (item as TextItem).width * 1;
        const height = (item as TextItem).height * -1;

        // save the coordinates of the matching text
        matches.push({ page: i, coords: [x, y, width, height] });
      }
    }
  }

  // highlight the matching text on the canvas
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
    matches.forEach(match => {
      const [x, y, width, height] = match.coords;
      ctx.fillRect(x, y, width, height);
    });
  }

  return matches;
}

import {Configuration, OpenAIApi} from 'openai'
async function get_embeddings(text : string) {
    const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    });
    const parameters= {
        model: 'text-embedding-ada-002',
        input: text
    }
    const openai = new OpenAIApi(configuration);
    const resp = await openai.createEmbedding(parameters);
    return resp.data.data[0].embedding;
}



async function readPdfText(pdfjsDoc: pdfjsLib.PDFDocumentProxy): Promise<Map<number, number[]>> {
  const pageEmbeddings = new Map<number, number[]>();

  for (let i = 1; i <= pdfjsDoc.numPages; i++) {
    const page = await pdfjsDoc.getPage(i);
    const pageTextContent = await page.getTextContent();
    const pageText = pageTextContent.items.map((item) => (item as TextItem).str).join(' ');
    const key = computeMd5(pageText);
    const value = localStorage.getItem(key);
    if (value === null) {
        const emb = await get_embeddings(pageText);
        pageEmbeddings.set(i, emb);
        localStorage.setItem(key, JSON.stringify(emb));
        console.log("embedding for page " + i + " computed");
    } else {
        pageEmbeddings.set(i, JSON.parse(value));
        console.log("embedding for page " + i + " retrieved from cache");
    }
  }
  return pageEmbeddings;
}


//
// const element_apikey = document.getElementById("openai_api_key");
// element_apikey?.addEventListener("change", openai_api_key_updated);
//
// const element_button = document.getElementById("submit");
// element_button?.addEventListener("click", submit);
//
// let ph = `<Commission>Committee on Political Affairs, Security and Human Rights</Commission>
// <DocRef>EUAL_OJ(2022)1201</DocRef>
// <TitreType>DRAFT AGENDA</TitreType>
// Meeting
// <Titre>Thursday 12 March 2022, 9.30-12.00</Titre>
// Luxembourg (Luxembourg)
// Room RZEZ 1G6
// 1.  Adoption of draft agenda                ER - ZZ233.235v04-00
// 2.  Election of members of the committee Bureau
// 3.  Approval of the minutes of the meeting of:
//    23 March 2021 (Buenos Aires, Argentina)         OO - BB107.199v01-00
// 4.  Co-Chairs’ announcements    *** Voting Time ***
// 5.  Draft Report on “combating hate speech in the European Union and Latin America and the Caribbean”
// EP co-rapporteur:       Ludovic Cruchot (Gendarmerie National, France)
// LAC co-rapporteur:      Claude Ratinier (Deputy, OXO)
//    Consideration of amendments (1-83)
//    Vote in committee on the amendments and the motion for a resolution
// *** End of vote ***`
//
// const prompt_prefix = `Considering the following document :
//
// <Commission>Committee on Political Affairs, Security and Human Rights</Commission>
// <DocRef>EUAL_OJ(2022)1201</DocRef>
// <TitreType>DRAFT AGENDA</TitreType>
// Meeting
// <Titre>Thursday 1 December 2022, 9.30-12.00</Titre>
// Brussels (Belgium)
// Room SPINELLI 1G2
// 1.\tAdoption of draft agenda\t\t\t\t\tOJ - AP103.232v01-00
// 2.\tElection of members of the committee Bureau
// 3.\tApproval of the minutes of the meeting of:
// \t12 April 2022 (Buenos Aires, Argentina)\t\t\tPV - AP103.160v01-00
// 4.\tCo-Chairs’ announcements
// *** Voting Time ***
// 5.\tDraft Report on “combating hate speech in the European Union and Latin America and the Caribbean”
// EP co-rapporteur:\t\tMaria Manuel Leitão-Marques (S&D, Portugal)
// LAC co-rapporteur:\t\tSidney Francis (Parlacen, Nicaragua)
// \tConsideration of amendments (1-83)
// \tVote in committee on the amendments and the motion for a resolution
// *** End of vote ***
// 6.\tDraft Report on “international cooperation and multilateralism against COVID-19”
// EP co-rapporteur:\t\tLeopoldo López Gil (EPP, Spain)
// LAC co-rapporteur:\t\tFernando Arce (Parlatino, Panama)
// \tFirst consideration of joint motion for a resolution
//
// we can extract the following JSON document :
// {
// "rapporteurs" : ["Maria Manuel Leitão-Marques (S&D, Portugal)", "Sidney Francis (Parlacen, Nicaragua)"],
// "files": ["PV - AP103.160v01-00", "OJ - AP103.232v01-00 "]
// }
//
// with a new document :
//
// `
//
// const prompt_suffix = `
//
//
// we can extract the following JSON document :
// [insert]
// `
//
// let doc = <HTMLInputElement>document.getElementById('doc');
// doc.placeholder = ph;
// //doc.value = ph;
//
// let OPENAI_API_KEY = localStorage.getItem("OPENAI_API_KEY");
//
// console.log(OPENAI_API_KEY);
// if(OPENAI_API_KEY)
// {
//     var inputElement = <HTMLInputElement>document.getElementById('openai_api_key');
//     inputElement.value = OPENAI_API_KEY;
// } else {
//     console.log("Define an API KEY")
// }
//
// import { Configuration, OpenAIApi } from "openai";
// let configuration = new Configuration({
//   apiKey:  OPENAI_API_KEY,
// });
// let openai = new OpenAIApi(configuration);
//
// function openai_api_key_updated(this: HTMLElement, ev: Event){
//     console.log("Change detected");
//     let OPENAI_API_KEY = (<HTMLInputElement>document.getElementById("openai_api_key")).value
//     localStorage.setItem("OPENAI_API_KEY", OPENAI_API_KEY);
//     console.log("Store OPENAI API KEY ", OPENAI_API_KEY);
//     configuration = new Configuration({
//         apiKey:  OPENAI_API_KEY,
//     });
//     openai = new OpenAIApi(configuration);
// }
//
// async function submit(this: HTMLElement, ev: Event){
//     console.log("Submit clicked");
//     (<HTMLInputElement>document.getElementById('submit')).textContent = "Wait please ... "
//     try {
//         let prompt = prompt_prefix + (<HTMLInputElement>document.getElementById('doc')).value + prompt_suffix;
//         const completion = await openai.createCompletion({
//             model: "text-davinci-003",
//             //model: "gpt-3.5-turbo",
//             prompt: prompt,
//             suffix: "\n\n\n\n\n\n\n\n",
//             temperature: 0.7,
//             max_tokens: 256,
//             top_p: 1,
//             frequency_penalty: 0,
//             presence_penalty: 0
//         });
//         (<HTMLInputElement>document.getElementById('submit')).textContent = " Extract rapporteurs and files"
//
//         console.log(completion);
//         let result = completion.data.choices[0].text;
//         result = result.replace("[end insert]","");
//         result = result.replace("[end]","");
//         console.log(result);
//         try {
//             result = JSON.parse(result);
//             (<HTMLInputElement>document.getElementById('results')).textContent = JSON.stringify(result, undefined, 2);
//         } catch (error) {
//             console.log(error);
//             (<HTMLInputElement>document.getElementById('results')).textContent = result;
//         }
//     } catch (error) {
//       if (error.response) {
//         console.log(error.response.status);
//         console.log(error.response.data);
//       } else {
//         console.log(error.message);
//       }
//     }
// }