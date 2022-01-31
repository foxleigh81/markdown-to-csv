#! /usr/bin/env node

/**
 * This file automatically generates a CSV file for each file in each specified directory.
 */

const fs = require('fs-extra');
const path = require('path');
const matter = require('gray-matter');
const { format } = require('date-fns');


/****************/
/* Configuration */
/****************/

// You can specify as many directories as you want here. .
const sourceDirectory = ['./source'];

// Specify an output directory to store the media and csv files.
const outputDirectory = './output';

// What number do you want the row id to start at?
const startid = 1;

// What files should be excluded from this process?
const excluded = ['.DS_Store'];

const headers = [
  'id',
  'title',
  'body',
  'created_at',
  'updated_at',
  'published_at',
  'created_by_id',
  'updated_by_id',
  'allow_comments',
  'tags',
  'excerpt'
]

/********************/
/* Start the Script */
/********************/

const arr = [];

// Delete the output directory if it exists so we can start fresh.
fs.removeSync(outputDirectory);

// Check required directories exist and create them if not
if (!fs.existsSync(outputDirectory)) fs.mkdirSync(outputDirectory);
if (!fs.existsSync(`${outputDirectory}/media`)) fs.mkdirSync(`${outputDirectory}/media`);

const convertJsonToCsv = (json, id) => {
  const data = json.map((item, index) => {

    const {
      title,
      excerpt,
      date,
      bgPos,
      comments
    } = item.data;

    const formatDate = (d) => format(new Date(d), 'yyyy-MM-dd HH:mm:ss.SSS');
    const cleanContent = (c) => {
      return c
        .replace(/<[^>]*>/g, '')
        .replace(/[’‘]/g, '&apos;')
        .replace(/["]/g, '""')
        .replace(/[\\]/g, '\\\\')
        .replace(/[–]/g, '&emdash;')
        .replace(/^.*<!-- end -->.*$/mg, "")
        .trim();
    };

    return `${id+index},"${title}","${cleanContent(item.content)}","${formatDate(date)}","${formatDate(new Date())}","${formatDate(new Date())}", 1, 1 ,${comments || true}, ${bgPos ? `bg-pos-${bgPos.replace(/%/g, 'pc').replace(/ /g, '-')}` : ''},"${excerpt ? cleanContent(excerpt) : ''}"`;
  });
  data.unshift(headers.join(','));
  return data.join('\n');
};

sourceDirectory.forEach((directory) => {
  const subdirs = fs.readdirSync(directory);
  subdirs.forEach(subdir => {
    let fileStat = fs.statSync(path.join(directory, subdir)).isDirectory();
    if(fileStat) {
      const files = fs.readdirSync(path.join(directory, subdir));
      files.forEach(file => {
        const { name, ext } = path.parse(file);
        let fileStat = fs.statSync(path.join(directory, subdir, file)).isDirectory();
        if(!fileStat) {
          if (file.endsWith('md')) {
            arr.push(matter(fs.readFileSync(path.resolve(directory, subdir, file))));
          } else {
            // If file is not one of the excluded files, copy it to the output directory.
            if (excluded.includes(file)) return;
            // Copy file to media directory
            fs.copySync(path.resolve(directory, subdir, file), path.resolve(outputDirectory, 'media', `${name}-${subdir}${ext}`));
          }
        } else {
          // Copy directory to media directory
          fs.copySync(path.resolve(directory, subdir, file), path.resolve(outputDirectory, 'media', `${file}-${subdir}`));
        }
      });    
    }
  });
  // console.log(arr);
  const csv = convertJsonToCsv(arr, startid);
  fs.writeFileSync(path.resolve(__dirname, outputDirectory, 'output.csv'), csv);
});