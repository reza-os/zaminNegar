import {useParams} from 'react-router-dom';
import CaseExcelForm from '../../components/employee/CaseExcelForm';
export default function CaseEditPage(){const {id}=useParams();return <CaseExcelForm id={id}/>;}
